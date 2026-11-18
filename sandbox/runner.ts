
type SandboxRequest = {
  type: "execute";
  id: string;
  javascript: string;
};

type SandboxResponse =
  | {
      type: "ready";
    }
  | {
      type: "error";
      id: string;
      message: string;
    };

const MAX_JAVASCRIPT_LENGTH = 200_000;

function isSandboxRequest(
  value: unknown
): value is SandboxRequest {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    request.type === "execute" &&
    typeof request.id === "string" &&
    request.id.length > 0 &&
    request.id.length <= 128 &&
    typeof request.javascript === "string" &&
    request.javascript.length <= MAX_JAVASCRIPT_LENGTH
  );
}

function send(
  message: SandboxResponse,
  targetOrigin: string
): void {
  window.parent.postMessage(
    message,
    targetOrigin
  );
}

const parentOrigin = new URL(
  document.referrer
).origin;

if (
  parentOrigin &&
  parentOrigin !== "null"
) {
  send({ type: "ready" }, parentOrigin);
}

window.addEventListener(
  "message",
  (event: MessageEvent<unknown>) => {
    if (
      event.source !== window.parent ||
      event.origin !== parentOrigin
    ) {
      return;
    }

    if (!isSandboxRequest(event.data)) {
      return;
    }

    // Execution intentionally remains disabled.
    // This endpoint will be connected to an
    // isolated, disposable execution worker
    // after its CSP and permissions are verified.
    send(
      {
        type: "error",
        id: event.data.id,
        message:
          "Sandbox execution is not enabled yet.",
      },
      parentOrigin
    );
  }
);
