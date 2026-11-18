
import { useEffect, useRef, useState } from "react";

import {
  Check,
  Code2,
  Copy,
  Play,
  RotateCcw,
  Square,
  Terminal,
} from "lucide-react";

import {
  getSandboxOrigin,
  SANDBOX_URL,
} from "../../lib/sandbox-config";

import "./EditableCode.css";

type EditableCodeProps = {
  code: string;
  onChange: (code: string) => void;
  onReset: () => void;
};

type OutputEntry = {
  level: "log" | "warn" | "error";
  text: string;
};

type CompileResponse =
  | {
      type: "compiled";
      javascript: string;
      diagnostics: string[];
    }
  | {
      type: "error";
      message: string;
      diagnostics: string[];
    };

type SandboxResponse =
  | { type: "ready" }
  | {
      type: "complete";
      id: string;
      output: OutputEntry[];
    }
  | {
      type: "error";
      id: string;
      message: string;
      output: OutputEntry[];
    }
  | { type: "stopped"; id: string };

type ExecutionStatus =
  | "idle"
  | "running"
  | "success"
  | "error"
  | "stopped";

const EXECUTION_TIMEOUT = 6000;

// Keep disabled until security testing is complete.
const CODE_EXECUTION_ENABLED = false;

function isOutputEntry(
  value: unknown
): value is OutputEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    (entry.level === "log" ||
      entry.level === "warn" ||
      entry.level === "error") &&
    typeof entry.text === "string" &&
    entry.text.length <= 4000
  );
}

function isSandboxResponse(
  value: unknown
): value is SandboxResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (data.type === "ready") return true;

  if (
    typeof data.id !== "string" ||
    data.id.length > 128
  ) {
    return false;
  }

  if (data.type === "stopped") return true;

  if (
    data.type !== "complete" &&
    data.type !== "error"
  ) {
    return false;
  }

  if (
    !Array.isArray(data.output) ||
    data.output.length > 100 ||
    !data.output.every(isOutputEntry)
  ) {
    return false;
  }

  return (
    data.type === "complete" ||
    (typeof data.message === "string" &&
      data.message.length <= 4000)
  );
}

export function EditableCode({
  code,
  onChange,
  onReset,
}: EditableCodeProps) {
  const [copiedCode, setCopiedCode] =
    useState<string | null>(null);

  const [status, setStatus] =
    useState<ExecutionStatus>("idle");

  const [output, setOutput] =
    useState<OutputEntry[]>([]);

  const compilerRef = useRef<Worker | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(
    null
  );

  const timeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const runIdRef = useRef(0);

  const copied = copiedCode === code;
  const running = status === "running";

  function cleanup() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    compilerRef.current?.terminate();
    compilerRef.current = null;

    iframeRef.current?.remove();
    iframeRef.current = null;
  }

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      cleanup();
    };
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
    } catch {
      setCopiedCode(null);
    }
  }

  function fail(message: string) {
    cleanup();
    setStatus("error");
    setOutput([{ level: "error", text: message }]);
  }

  function stopExecution() {
    runIdRef.current += 1;
    cleanup();

    setStatus("stopped");
    setOutput([
      {
        level: "warn",
        text: "Execution stopped.",
      },
    ]);
  }

  function runCode() {
    if (!CODE_EXECUTION_ENABLED || running) return;

    const sandboxOrigin = getSandboxOrigin();

    if (!sandboxOrigin) {
      fail("Sandbox URL is not configured.");
      return;
    }

    runIdRef.current += 1;
    const runId = runIdRef.current;
    const requestId = crypto.randomUUID();

    cleanup();
    setStatus("running");
    setOutput([]);

    const isCurrent = () =>
      runId === runIdRef.current;

    timeoutRef.current = setTimeout(() => {
      if (!isCurrent()) return;

      runIdRef.current += 1;
      fail("Execution timed out.");
    }, EXECUTION_TIMEOUT);

    let compiler: Worker;

    try {
      compiler = new Worker(
        new URL(
          "../../workers/typescript-runner.worker.ts",
          import.meta.url
        ),
        { type: "module" }
      );
    } catch {
      fail("Unable to start TypeScript compiler.");
      return;
    }

    compilerRef.current = compiler;

    compiler.onerror = () => {
      if (isCurrent()) {
        fail("TypeScript compiler failed.");
      }
    };

    compiler.onmessage = (
      event: MessageEvent<CompileResponse>
    ) => {
      if (!isCurrent()) return;

      compiler.terminate();
      compilerRef.current = null;

      const result = event.data;

      if (
        !result ||
        (result.type !== "compiled" &&
          result.type !== "error")
      ) {
        fail("Invalid compiler response.");
        return;
      }

      if (result.type === "error") {
        fail(
          [
            result.message,
            ...result.diagnostics,
          ].join("\n")
        );
        return;
      }

      const iframe = document.createElement("iframe");

      iframe.title = "Code execution sandbox";
      iframe.style.display = "none";
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.referrerPolicy = "no-referrer";
      iframe.src = SANDBOX_URL;

      iframeRef.current = iframe;

      const onMessage = (
        messageEvent: MessageEvent<unknown>
      ) => {
        if (!isCurrent()) return;

        if (
          messageEvent.source !== iframe.contentWindow
        ) {
          return;
        }

        // An iframe without allow-same-origin sends
        // messages with the opaque origin "null".
        if (messageEvent.origin !== "null") {
          return;
        }

        if (!isSandboxResponse(messageEvent.data)) {
          return;
        }

        const response = messageEvent.data;

        if (response.type === "ready") {
          iframe.contentWindow?.postMessage(
            {
              type: "execute",
              id: requestId,
              javascript: result.javascript,
            },
            sandboxOrigin
          );
          return;
        }

        if (response.id !== requestId) return;

        window.removeEventListener(
          "message",
          onMessage
        );

        if (response.type === "stopped") {
          stopExecution();
          return;
        }

        cleanup();

        if (response.type === "complete") {
          setStatus("success");
          setOutput(
            response.output.length
              ? response.output
              : [
                  {
                    level: "log",
                    text:
                      "Execution completed. No console output.",
                  },
                ]
          );
        } else {
          setStatus("error");
          setOutput([
            ...response.output,
            {
              level: "error",
              text: response.message,
            },
          ]);
        }
      };

      window.addEventListener(
        "message",
        onMessage
      );

      iframe.onload = () => {
        if (!isCurrent()) return;

        iframe.contentWindow?.postMessage(
          { type: "init" },
          sandboxOrigin
        );
      };

      document.body.appendChild(iframe);
    };

    compiler.postMessage({
      type: "compile",
      code,
    });
  }

  function handleReset() {
    if (running) {
      runIdRef.current += 1;
      cleanup();
    }

    onReset();
    setStatus("idle");
    setOutput([]);
  }

  return (
    <div className="code-mode-workspace">
      <section className="panel editable-code-panel">
        <div className="panel-header compact">
          <div>
            <div className="panel-label">
              <Code2 size={16} />
              EDITABLE TYPESCRIPT
            </div>

            <p>
              Edit TypeScript using the installed
              is-kit library.
            </p>
          </div>

          <div className="editable-code-actions">
            <button
              type="button"
              className="copy-button"
              onClick={handleReset}
              title="Restore the current visual example"
            >
              <RotateCcw size={15} />
              Reset code
            </button>

            <button
              type="button"
              className="copy-button"
              onClick={copyCode}
            >
              {copied ? (
                <Check size={15} />
              ) : (
                <Copy size={15} />
              )}
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>
        </div>

        <div className="editable-code-shell">
          <div className="editor-topline">
            <span>playground.ts</span>
            <span>TypeScript</span>
          </div>

          <textarea
            className="editable-typescript-input"
            aria-label="Editable TypeScript source code"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            value={code}
            onChange={(event) =>
              onChange(event.target.value)
            }
          />
        </div>

        <div className="code-execution-toolbar">
          <p className="editable-code-note">
            Code execution is temporarily unavailable
            while sandbox security is being tested.
          </p>

          {running ? (
            <button
              type="button"
              className="execution-button stop"
              onClick={stopExecution}
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="execution-button run"
              onClick={runCode}
              disabled={!CODE_EXECUTION_ENABLED}
              title="Code execution is awaiting security testing."
            >
              <Play size={14} />
              Run Code
            </button>
          )}
        </div>
      </section>

      <section className="panel execution-output-panel">
        <div className="execution-output-header">
          <div className="panel-label">
            <Terminal size={16} />
            EXECUTION OUTPUT
          </div>

          <span
            className={`execution-status execution-status-${status}`}
          >
            {status === "idle"
              ? "READY"
              : status === "running"
                ? "RUNNING"
                : status === "success"
                  ? "COMPLETED"
                  : status === "stopped"
                    ? "STOPPED"
                    : "ERROR"}
          </span>
        </div>

        <div
          className="execution-console"
          role="log"
          aria-live="polite"
        >
          {status === "idle" && (
            <p className="execution-placeholder">
              Code execution is temporarily disabled.
            </p>
          )}

          {status === "running" && (
            <p className="execution-placeholder">
              Compiling and executing...
            </p>
          )}

          {output.map((entry, index) => (
            <pre
              key={index}
              className={`execution-line execution-line-${entry.level}`}
            >
              {entry.text}
            </pre>
          ))}
        </div>
      </section>
    </div>
  );
}
