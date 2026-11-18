
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

type WorkerResponse =
  | {
      type: "complete";
      output: OutputEntry[];
    }
  | {
      type: "error";
      message: string;
      output: OutputEntry[];
    };

type ExecutionStatus =
  | "idle"
  | "running"
  | "success"
  | "error"
  | "stopped";

const EXECUTION_TIMEOUT = 3000;

// Temporary safeguard while secure execution is implemented.
const CODE_EXECUTION_ENABLED = false;

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

  const workerRef = useRef<Worker | null>(null);

  const timeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const runIdRef = useRef(0);

  const copied = copiedCode === code;
  const running = status === "running";

  function clearExecutionResources() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      runIdRef.current += 1;

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
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

  function stopExecution() {
    runIdRef.current += 1;
    clearExecutionResources();

    setStatus("stopped");

    setOutput((current) => [
      ...current,
      {
        level: "warn",
        text: "Execution stopped.",
      },
    ]);
  }

  function runCode() {
    if (!CODE_EXECUTION_ENABLED) {
      return;
    }

    runIdRef.current += 1;
    const runId = runIdRef.current;

    clearExecutionResources();

    setStatus("running");
    setOutput([]);

    let worker: Worker;

    try {
      worker = new Worker(
        new URL(
          "../../workers/typescript-runner.worker.ts",
          import.meta.url
        ),
        {
          type: "module",
        }
      );
    } catch (error) {
      setStatus("error");
      setOutput([
        {
          level: "error",
          text:
            error instanceof Error
              ? error.message
              : "Unable to start execution worker.",
        },
      ]);
      return;
    }

    workerRef.current = worker;

    worker.onmessage = (
      event: MessageEvent<WorkerResponse>
    ) => {
      if (runId !== runIdRef.current) {
        return;
      }

      clearExecutionResources();

      const response = event.data;

      if (response.type === "complete") {
        setStatus("success");

        setOutput(
          response.output.length > 0
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

    worker.onerror = (event) => {
      if (runId !== runIdRef.current) {
        return;
      }

      clearExecutionResources();

      setStatus("error");

      setOutput([
        {
          level: "error",
          text:
            event.message ||
            "An execution worker error occurred.",
        },
      ]);
    };

    timeoutRef.current = setTimeout(() => {
      if (runId !== runIdRef.current) {
        return;
      }

      runIdRef.current += 1;
      clearExecutionResources();

      setStatus("error");

      setOutput([
        {
          level: "error",
          text:
            "Execution exceeded the 3-second limit and was stopped.",
        },
      ]);
    }, EXECUTION_TIMEOUT);

    worker.postMessage({
      type: "run",
      code,
    });
  }

  function handleReset() {
    if (running) {
      runIdRef.current += 1;
      clearExecutionResources();
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
            while the secure sandbox is being implemented.
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
              title={
                CODE_EXECUTION_ENABLED
                  ? "Run TypeScript"
                  : "Code execution is temporarily disabled while the secure sandbox is being implemented."
              }
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
