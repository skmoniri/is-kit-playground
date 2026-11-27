import { test, expect } from "@playwright/test";

const SANDBOX = "https://is-kit-sandbox.github.io/";
const PARENT_ORIGIN = "https://skmoniri.github.io";

test("sandbox is on a separate origin", async ({ page }) => {
  await page.goto(SANDBOX);

  expect(new URL(page.url()).origin).not.toBe(PARENT_ORIGIN);
});

test("CSP blocks fetch requests", async ({ page }) => {
  await page.goto(SANDBOX);

  const result = await page.evaluate(async () => {
    const violations: string[] = [];

    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(event.violatedDirective);
    });

    let succeeded = false;

    try {
      await fetch("https://example.com", {
        mode: "no-cors",
      });
      succeeded = true;
    } catch {
      // Expected when CSP blocks the request.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    return { succeeded, violations };
  });

  expect(result.succeeded).toBe(false);
  expect(result.violations).toContain("connect-src");
});

test("CSP blocks WebSocket connections", async ({ page }) => {
  await page.goto(SANDBOX);

  const result = await page.evaluate(async () => {
    const violations: string[] = [];

    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(event.violatedDirective);
    });

    const connected = await new Promise<boolean>((resolve) => {
      const socket = new WebSocket("wss://echo.websocket.events");

      let settled = false;

      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        socket.close();
        resolve(value);
      };

      socket.onopen = () => finish(true);
      socket.onerror = () => finish(false);

      setTimeout(() => finish(false), 1500);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    return { connected, violations };
  });

  expect(result.connected).toBe(false);
  expect(result.violations).toContain("connect-src");
});

test("rejects unauthorized initialization", async ({ page }) => {
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
