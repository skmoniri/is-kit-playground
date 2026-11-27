import { test, expect, type Page } from "@playwright/test";

const SANDBOX = "https://is-kit-sandbox.github.io/";
const PARENT = "https://skmoniri.github.io/is-kit-playground/";

type OutputEntry = {
  level: "log" | "warn" | "error";
  text: string;
};

type WorkerResponse = {
  type: "complete" | "error" | "stopped";
  id: string;
  output?: OutputEntry[];
  message?: string;
};

type SandboxSession = {
  execute: (id: string, javascript: string) => Promise<WorkerResponse>;
  close: () => Promise<void>;
};

async function createSandboxSession(page: Page): Promise<SandboxSession> {
  await page.goto(PARENT);

  expect(new URL(page.url()).origin).toBe("https://skmoniri.github.io");

  await page.evaluate(async (sandboxUrl) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox.add("allow-scripts", "allow-same-origin");
    iframe.src = sandboxUrl;

    const loaded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Sandbox iframe failed to load")),
        5000,
      );

      iframe.onload = () => {
        clearTimeout(timer);
        resolve();
      };
    });

    document.body.appendChild(iframe);
    await loaded;

    const channel = new MessageChannel();

    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Sandbox did not initialize")),
        5000,
      );

      channel.port1.onmessage = (event) => {
        if (event.data?.type === "ready") {
          clearTimeout(timer);
          resolve();
        }
      };
    });

    iframe.contentWindow?.postMessage(
      { type: "init" },
      new URL(sandboxUrl).origin,
      [channel.port2],
    );

    await ready;

    const testWindow = window as typeof window & {
      __sandboxTest?: {
        port: MessagePort;
        iframe: HTMLIFrameElement;
      };
    };

    testWindow.__sandboxTest = {
      port: channel.port1,
      iframe,
    };
  }, SANDBOX);

  return {
    execute: async (id, javascript) => {
      return page.evaluate(
        async ({ id, javascript }) => {
          const testWindow = window as typeof window & {
            __sandboxTest?: {
              port: MessagePort;
              iframe: HTMLIFrameElement;
            };
          };

          const session = testWindow.__sandboxTest;

          if (!session) {
            throw new Error("Sandbox session missing");
          }

          return new Promise<WorkerResponse>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error("No worker response")),
              5000,
            );

            session.port.onmessage = (event: MessageEvent<WorkerResponse>) => {
              if (event.data?.id !== id) return;

              clearTimeout(timer);
              resolve(event.data);
            };

            session.port.postMessage({
              type: "execute",
              id,
              javascript,
            });
          });
        },
        { id, javascript },
      );
    },

    close: async () => {
      await page.evaluate(() => {
        const testWindow = window as typeof window & {
          __sandboxTest?: {
            port: MessagePort;
            iframe: HTMLIFrameElement;
          };
        };

        const session = testWindow.__sandboxTest;

        if (session) {
          session.port.close();
          session.iframe.remove();
          delete testWindow.__sandboxTest;
        }
      });
    },
  };
}

test("execution worker rejects unauthorized parent", async ({ page }) => {
  await page.goto(SANDBOX);

  const result = await page.evaluate(async () => {
    const channel = new MessageChannel();

    return new Promise<string>((resolve) => {
      const timer = setTimeout(() => {
        channel.port1.close();
        resolve("BLOCKED");
      }, 1000);

      channel.port1.onmessage = () => {
        clearTimeout(timer);
        channel.port1.close();
        resolve("ALLOWED");
      };

      window.postMessage({ type: "init" }, window.location.origin, [
        channel.port2,
      ]);
    });
  });

  expect(result).toBe("BLOCKED");
});

test("execution worker runs normal JavaScript", async ({ page }) => {
  const session = await createSandboxSession(page);

  try {
    const result = await session.execute("normal", 'console.log("WORKING")');

    expect(result.type).toBe("complete");
    expect(result.output?.[0]?.text).toBe("WORKING");
  } finally {
    await session.close();
  }
});

test("execution worker timeout and recovery", async ({ page }) => {
  const session = await createSandboxSession(page);

  try {
    const timeout = await session.execute("infinite", "while (true) {}");

    expect(timeout.type).toBe("error");
    expect(timeout.message).toContain("3-second limit");

    const recovery = await session.execute(
      "recovery",
      'console.log("RECOVERED")',
    );

    expect(recovery.type).toBe("complete");
    expect(recovery.output?.[0]?.text).toBe("RECOVERED");
  } finally {
    await session.close();
  }
});

test("execution worker blocks external fetch", async ({ page }) => {
  const session = await createSandboxSession(page);

  try {
    const result = await session.execute(
      "fetch-test",
      `
      try {
        await globalThis.fetch("https://example.com", {
          mode: "no-cors"
        });
        console.log("FETCH_ALLOWED");
      } catch {
        console.log("FETCH_BLOCKED");
      }
      `,
    );

    expect(result.type).toBe("complete");
    expect(result.output?.[0]?.text).toBe("FETCH_BLOCKED");
  } finally {
    await session.close();
  }
});

test("execution worker blocks WebSocket connections", async ({ page }) => {
  const session = await createSandboxSession(page);

  try {
    const result = await session.execute(
      "websocket-test",
      `
      const connected = await new Promise((resolve) => {
        try {
          const socket = new WebSocket(
            "wss://echo.websocket.events"
          );

          let settled = false;

          const finish = (value) => {
            if (settled) return;
            settled = true;
            socket.close();
            resolve(value);
          };

          socket.onopen = () => finish(true);
          socket.onerror = () => finish(false);

          setTimeout(() => finish(false), 1000);
        } catch {
          resolve(false);
        }
      });

      console.log(
        connected ? "WS_ALLOWED" : "WS_BLOCKED"
      );
      `,
    );

    expect(result.type).toBe("complete");
    expect(result.output?.[0]?.text).toBe("WS_BLOCKED");
  } finally {
    await session.close();
  }
});
