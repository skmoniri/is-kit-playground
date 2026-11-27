import { test, expect, type Page } from "@playwright/test";

const PARENT = "https://skmoniri.github.io/is-kit-playground/";
const SANDBOX = "https://is-kit-sandbox.github.io/";

type ExecutionResult = {
  type: string;
  output?: Array<{ text: string }>;
  message?: string;
};

async function executeInSandbox(
  page: Page,
  javascript: string,
): Promise<ExecutionResult> {
  await page.goto(PARENT);

  return page.evaluate(
    async ({ sandboxUrl, javascript }) => {
      const iframe = document.createElement("iframe");

      iframe.sandbox.add("allow-scripts", "allow-same-origin");
      iframe.src = sandboxUrl;

      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Sandbox load timeout")),
            10000,
          );

          iframe.onload = () => {
            clearTimeout(timer);
            resolve();
          };

          document.body.appendChild(iframe);
        });

        const channel = new MessageChannel();

        try {
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

          return await new Promise<ExecutionResult>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error("Execution response timeout")),
              10000,
            );

            channel.port1.onmessage = (event) => {
              if (event.data?.id !== "adversarial-test") {
                return;
              }

              clearTimeout(timer);
              resolve(event.data);
            };

            channel.port1.postMessage({
              type: "execute",
              id: "adversarial-test",
              javascript,
            });
          });
        } finally {
          channel.port1.close();
        }
      } finally {
        iframe.remove();
      }
    },
    { sandboxUrl: SANDBOX, javascript },
  );
}

test("worker cannot access DOM or browser storage", async ({ page }) => {
  const result = await executeInSandbox(
    page,
    `
    console.log("DOCUMENT:" + typeof document);
    console.log("WINDOW:" + typeof window);
    console.log("LOCAL_STORAGE:" + typeof localStorage);
    console.log("PARENT:" + typeof parent);
    `,
  );

  expect(result.type).toBe("complete");

  expect(result.output?.map((entry) => entry.text)).toEqual([
    "DOCUMENT:undefined",
    "WINDOW:undefined",
    "LOCAL_STORAGE:undefined",
    "PARENT:undefined",
  ]);
});

test("worker CSP blocks external XMLHttpRequest", async ({ page }) => {
  const result = await executeInSandbox(
    page,
    `
    const xhr = new XMLHttpRequest();

    try {
      xhr.open("GET", "https://example.com/", true);

      const outcome = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          xhr.abort();
          resolve("XHR_TIMEOUT");
        }, 1500);

        xhr.onload = () => {
          clearTimeout(timer);
          resolve("XHR_ALLOWED");
        };

        xhr.onerror = () => {
          clearTimeout(timer);
          resolve("XHR_BLOCKED");
        };

        xhr.send();
      });

      console.log(outcome);
    } catch {
      console.log("XHR_BLOCKED");
    }
    `,
  );

  expect(result.type).toBe("complete");
  expect(result.output?.[0]?.text).toBe("XHR_BLOCKED");
});

test("worker cannot use importScripts to load external code", async ({
  page,
}) => {
  const result = await executeInSandbox(
    page,
    `
    try {
      importScripts("https://example.com/test.js");
      console.log("IMPORT_ALLOWED");
    } catch {
      console.log("IMPORT_BLOCKED");
    }
    `,
  );

  expect(result.type).toBe("complete");
  expect(result.output?.[0]?.text).toBe("IMPORT_BLOCKED");
});

test("worker cannot create an unrestricted child worker", async ({ page }) => {
  const result = await executeInSandbox(
    page,
    `
    try {
      const worker = new Worker(
        "https://example.com/test.js"
      );

      worker.terminate();

      console.log("WORKER_CREATED");
    } catch {
      console.log("WORKER_BLOCKED");
    }
    `,
  );

  expect(result.type).toBe("complete");
  expect(result.output?.[0]?.text).toBe("WORKER_BLOCKED");
});

test("worker cannot access the parent application's DOM", async ({ page }) => {
  const result = await executeInSandbox(
    page,
    `
    try {
      console.log(parent.document.body.innerHTML);
      console.log("PARENT_ACCESS_ALLOWED");
    } catch {
      console.log("PARENT_ACCESS_BLOCKED");
    }
    `,
  );

  expect(result.type).toBe("complete");
  expect(result.output?.[0]?.text).toBe("PARENT_ACCESS_BLOCKED");
});

test("worker cannot dynamically import remote modules", async ({ page }) => {
  const result = await executeInSandbox(
    page,
    `
    try {
      await import("https://example.com/test.js");
      console.log("DYNAMIC_IMPORT_ALLOWED");
    } catch {
      console.log("DYNAMIC_IMPORT_BLOCKED");
    }
    `,
  );

  expect(result.type).toBe("complete");
  expect(result.output?.[0]?.text).toBe("DYNAMIC_IMPORT_BLOCKED");
});

test("execution worker reports CSP violation for fetch", async ({ page }) => {
  const result = await executeInSandbox(
    page,
    `
    const violations = [];

    self.addEventListener(
      "securitypolicyviolation",
      (event) => {
        violations.push({
          directive: event.effectiveDirective,
          blockedURI: event.blockedURI,
        });
      }
    );

    try {
      await fetch("https://example.com/", {
        mode: "no-cors",
      });
      console.log("FETCH_ALLOWED");
    } catch {
      console.log("FETCH_BLOCKED");
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(
      "CSP_VIOLATIONS:" + JSON.stringify(violations)
    );
    `,
  );

  expect(result.type).toBe("complete");

  const output = result.output?.map((entry) => entry.text) ?? [];

  expect(output).toContain("FETCH_BLOCKED");

  const violationEntry = output.find((entry) =>
    entry.startsWith("CSP_VIOLATIONS:"),
  );

  expect(violationEntry).toBeDefined();

  const violations = JSON.parse(
    violationEntry!.slice("CSP_VIOLATIONS:".length),
  ) as Array<{ directive: string; blockedURI: string }>;

  expect(
    violations.some((violation) => violation.directive === "connect-src"),
  ).toBe(true);
});
