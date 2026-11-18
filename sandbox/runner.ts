
/// <reference types="vite/client" />

type OutputEntry = {
  level: "log" | "warn" | "error";
  text: string;
};

type ChannelMessage =
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

const configuredOrigin = import.meta.env.VITE_PARENT_ORIGIN;

const ALLOWED_PARENT_ORIGIN =
  typeof configuredOrigin === "string" &&
  configuredOrigin.length > 0
    ? configuredOrigin
    : "http://127.0.0.1:3000";

let channel: MessagePort | null = null;
let activeWorker: Worker | null = null;
let activeTimeout: ReturnType<typeof setTimeout> | null = null;
let activeId: string | null = null;

function send(message: Record<string, unknown>): void {
  channel?.postMessage(message);
}

function cleanupExecution(): void {
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

function isValidId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128
  );
}

function isChannelMessage(
  value: unknown
): value is ChannelMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  if (message.type === "stop") {
    return isValidId(message.id);
  }

  if (message.type === "execute") {
    return (
      isValidId(message.id) &&
      typeof message.javascript === "string" &&
      message.javascript.length <=
        MAX_JAVASCRIPT_LENGTH
    );
  }

  return false;
}

function execute(id: string, javascript: string): void {
  cleanupExecution();

  let worker: Worker;

  try {
    worker = new Worker(
      new URL("./execution.worker.ts", import.meta.url),
      { type: "module" }
    );
  } catch {
    send({
      type: "error",
      id,
      message: "Unable to create execution worker.",
      output: [],
    });
    return;
  }

  activeWorker = worker;
  activeId = id;

  worker.onmessage = (
    event: MessageEvent<WorkerResponse>
  ) => {
    if (activeWorker !== worker || activeId !== id) {
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

    cleanupExecution();

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
    if (activeWorker !== worker || activeId !== id) {
      return;
    }

    cleanupExecution();

    send({
      type: "error",
      id,
      message: "Execution worker failed.",
      output: [],
    });
  };

  activeTimeout = setTimeout(() => {
    if (activeWorker !== worker || activeId !== id) {
      return;
    }

    cleanupExecution();

    send({
      type: "error",
      id,
      message: "Execution exceeded the 3-second limit.",
      output: [],
    });
  }, EXECUTION_TIMEOUT);

  worker.postMessage({
    type: "execute",
    id,
    javascript,
  });
}

function handleChannelMessage(
  event: MessageEvent<unknown>
): void {
  if (!isChannelMessage(event.data)) {
    return;
  }

  const message = event.data;

  if (message.type === "stop") {
    if (activeId !== message.id) {
      return;
    }

    cleanupExecution();

    send({
      type: "stopped",
      id: message.id,
    });

    return;
  }

  execute(message.id, message.javascript);
}

window.addEventListener(
  "message",
  (event: MessageEvent<unknown>) => {
    if (
      event.source !== window.parent ||
      event.origin !== ALLOWED_PARENT_ORIGIN
    ) {
      return;
    }

    if (
      !event.data ||
      typeof event.data !== "object" ||
      event.data.type !== "init"
    ) {
      return;
    }

    // Only accept one initialization per iframe.
    if (channel !== null) {
      return;
    }

    const transferredPort = event.ports[0];

    if (!transferredPort) {
      return;
    }

    channel = transferredPort;
    channel.onmessage = handleChannelMessage;
    channel.start();

    send({ type: "ready" });
  }
);

window.addEventListener("pagehide", () => {
  cleanupExecution();
  channel?.close();
  channel = null;
});
