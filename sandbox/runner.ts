/// <reference types="vite/client" />

type OutputEntry = {
  level: "log" | "warn" | "error";
  text: string;
};

type ParentMessage =
  | {
      type: "init";
    }
  | {
      type: "execute";
      id: string;
      javascript: string;
    }
  | {
      type: "stop";
      id: string;
    };

type WorkerResponse =
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
    };

const EXECUTION_TIMEOUT = 3000;
const MAX_JAVASCRIPT_LENGTH = 200_000;

const configuredOrigin =
  import.meta.env.VITE_PARENT_ORIGIN;

const ALLOWED_PARENT_ORIGIN =
  typeof configuredOrigin === "string" &&
  configuredOrigin.length > 0
    ? configuredOrigin
    : "http://127.0.0.1:3000";

let activeWorker: Worker | null = null;
let activeTimeout: ReturnType<
  typeof setTimeout
> | null = null;
let activeId: string | null = null;
let authorized = false;

function send(
  message: Record<string, unknown>
): void {
  window.parent.postMessage(
    message,
    ALLOWED_PARENT_ORIGIN
  );
}

function cleanup(): void {
  if (activeTimeout !== null) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }

  if (activeWorker !== null) {
    activeWorker.terminate();
    activeWorker = null;
  }

  activeId = null;
}

function isValidId(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128
  );
}

function isParentMessage(
  value: unknown
): value is ParentMessage {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const message = value as Record<
    string,
    unknown
  >;

  if (message.type === "init") {
    return true;
  }

  if (message.type === "stop") {
    return isValidId(message.id);
  }

  if (message.type === "execute") {
    return (
      isValidId(message.id) &&
      typeof message.javascript ===
        "string" &&
      message.javascript.length <=
        MAX_JAVASCRIPT_LENGTH
    );
  }

  return false;
}

function execute(
  id: string,
  javascript: string
): void {
  cleanup();

  let worker: Worker;

  try {
    worker = new Worker(
      new URL(
        "./execution.worker.ts",
        import.meta.url
      ),
      { type: "module" }
    );
  } catch {
    send({
      type: "error",
      id,
      message:
        "Unable to create execution worker.",
      output: [],
    });
    return;
  }

  activeWorker = worker;
  activeId = id;

  worker.onmessage = (
    event: MessageEvent<WorkerResponse>
  ) => {
    if (
      activeWorker !== worker ||
      activeId !== id
    ) {
      return;
    }

    const response = event.data;

    if (
      !response ||
      response.id !== id ||
      (response.type !== "complete" &&
        response.type !== "error")
    ) {
      return;
    }

    cleanup();

    send({
      type: response.type,
      id,
      output: response.output,
      ...(response.type === "error"
        ? { message: response.message }
        : {}),
    });
  };

  worker.onerror = () => {
    if (
      activeWorker !== worker ||
      activeId !== id
    ) {
      return;
    }

    cleanup();

    send({
      type: "error",
      id,
      message:
        "Execution worker failed.",
      output: [],
    });
  };

  activeTimeout = setTimeout(() => {
    if (
      activeWorker !== worker ||
      activeId !== id
    ) {
      return;
    }

    cleanup();

    send({
      type: "error",
      id,
      message:
        "Execution exceeded the 3-second limit.",
      output: [],
    });
  }, EXECUTION_TIMEOUT);

  worker.postMessage({
    type: "execute",
    id,
    javascript,
  });
}

window.addEventListener(
  "message",
  (event: MessageEvent<unknown>) => {
    if (
      event.source !== window.parent ||
      event.origin !==
        ALLOWED_PARENT_ORIGIN
    ) {
      return;
    }

    if (!isParentMessage(event.data)) {
      return;
    }

    const message = event.data;

    if (message.type === "init") {
      authorized = true;

      send({
        type: "ready",
      });

      return;
    }

    if (!authorized) {
      return;
    }

    if (message.type === "stop") {
      if (activeId !== message.id) {
        return;
      }

      cleanup();

      send({
        type: "stopped",
        id: message.id,
      });

      return;
    }

    if (message.type === "execute") {
      execute(
        message.id,
        message.javascript
      );
    }
  }
);

window.addEventListener(
  "pagehide",
  cleanup
);
