import { test, expect, type Page } from "@playwright/test";

const PARENT = "https://skmoniri.github.io/is-kit-playground/";
const SANDBOX = "https://is-kit-sandbox.github.io/";

type Response = {
  type: string;
  id?: string;
  message?: string;
  output?: Array<{ level: string; text: string }>;
};

async function createSession(page: Page) {
  await page.goto(PARENT);

  await page.evaluate(async (sandboxUrl) => {
    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts", "allow-same-origin");
    iframe.src = sandboxUrl;

    const loaded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Sandbox load timeout")),
        10000,
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
        () => reject(new Error("Sandbox initialization timeout")),
        10000,
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

    const state = window as typeof window & {
      __securitySession?: {
        iframe: HTMLIFrameElement;
        port: MessagePort;
      };
    };

    state.__securitySession = {
      iframe,
      port: channel.port1,
    };
  }, SANDBOX);
}

async function sendMessages(
  page: Page,
  messages: unknown[],
  expectedId: string,
): Promise<Response> {
  return page.evaluate(
    async ({ messages, expectedId }) => {
      const state = window as typeof window & {
        __securitySession?: {
          port: MessagePort;
        };
      };

      const port = state.__securitySession?.port;

      if (!port) {
        throw new Error("Sandbox session unavailable");
      }

      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("No expected response")),
          7000,
        );

        port.onmessage = (event: MessageEvent<Response>) => {
          if (event.data?.id !== expectedId) return;

          clearTimeout(timer);
          resolve(event.data);
        };

        for (const message of messages) {
          port.postMessage(message);
        }
      });
    },
    { messages, expectedId },
  );
}

test.afterEach(async ({ page }) => {
  if (page.isClosed()) return;

  await page.evaluate(() => {
    const state = window as typeof window & {
      __securitySession?: {
        iframe: HTMLIFrameElement;
        port: MessagePort;
      };
    };

    state.__securitySession?.port.close();
    state.__securitySession?.iframe.remove();

    delete state.__securitySession;
  });
});

test("malformed messages do not prevent valid execution", async ({ page }) => {
  await createSession(page);

  const result = await sendMessages(
    page,
    [
      null,
      "invalid",
      { type: "unknown", id: "bad" },
      { type: "execute", id: "", javascript: "" },
      { type: "execute", id: "bad", javascript: 123 },
      { type: "execute", id: "bad", javascript: "x".repeat(200001) },
      {
        type: "execute",
        id: "valid",
        javascript: 'console.log("RECOVERED")',
      },
    ],
    "valid",
  );

  expect(result.type).toBe("complete");
  expect(result.output?.[0]?.text).toBe("RECOVERED");
});

test("new execution cancels an earlier infinite loop", async ({ page }) => {
  await createSession(page);

  const result = await sendMessages(
    page,
    [
      {
        type: "execute",
        id: "old",
        javascript: "while (true) {}",
      },
      {
        type: "execute",
        id: "new",
        javascript: 'console.log("NEW_EXECUTION")',
      },
    ],
    "new",
  );

  expect(result.type).toBe("complete");
  expect(result.output?.[0]?.text).toBe("NEW_EXECUTION");
});

test("output is limited to 100 entries", async ({ page }) => {
  await createSession(page);

  const result = await sendMessages(
    page,
    [
      {
        type: "execute",
        id: "output-limit",
        javascript: `
          for (let i = 0; i < 200; i++) {
            console.log("ENTRY_" + i);
          }
        `,
      },
    ],
    "output-limit",
  );

  expect(result.type).toBe("complete");
  expect(result.output).toHaveLength(100);
});

test("individual output entries are limited to 4000 characters", async ({
  page,
}) => {
  await createSession(page);

  const result = await sendMessages(
    page,
    [
      {
        type: "execute",
        id: "length-limit",
        javascript: 'console.log("A".repeat(10000))',
      },
    ],
    "length-limit",
  );

  expect(result.type).toBe("complete");
  expect(result.output?.[0]?.text.length).toBe(4000);
});

test("execution recovers after an infinite loop timeout", async ({ page }) => {
  await createSession(page);

  const timeout = await sendMessages(
    page,
    [
      {
        type: "execute",
        id: "timeout",
        javascript: "while (true) {}",
      },
    ],
    "timeout",
  );

  expect(timeout.type).toBe("error");
  expect(timeout.message).toContain("3-second limit");

  const recovery = await sendMessages(
    page,
    [
      {
        type: "execute",
        id: "recovery",
        javascript: 'console.log("RECOVERED")',
      },
    ],
    "recovery",
  );

  expect(recovery.type).toBe("complete");
  expect(recovery.output?.[0]?.text).toBe("RECOVERED");
});
