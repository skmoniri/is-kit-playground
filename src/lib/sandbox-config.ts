
/// <reference types="vite/client" />

const LOCAL_SANDBOX = "http://127.0.0.1:3001";

const configuredUrl = import.meta.env.VITE_SANDBOX_URL;

export const SANDBOX_URL =
  typeof configuredUrl === "string" &&
  configuredUrl.trim()
    ? configuredUrl.trim()
    : import.meta.env.DEV
      ? LOCAL_SANDBOX
      : "";

export function getSandboxOrigin(): string | null {
  if (!SANDBOX_URL) return null;

  try {
    const url = new URL(SANDBOX_URL);
    const isLocal =
      import.meta.env.DEV &&
      url.origin === LOCAL_SANDBOX;

    if (!isLocal && url.protocol !== "https:") {
      return null;
    }

    if (url.username || url.password) return null;
    if (url.pathname !== "/" || url.search || url.hash) {
      return null;
    }

    if (url.origin === window.location.origin) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}
