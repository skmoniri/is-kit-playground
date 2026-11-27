# is-kit Playground

**An interactive, visual playground for exploring [is-kit](https://github.com/necoz-oss/is-kit) TypeScript type guards.**

Build guards, experiment with object schemas, explore collections and unions, understand type narrowing, and generate TypeScript you can use in your projects.

> **Alpha:** This is an independent community project, not an official is-kit product. The interface and supported examples are still evolving. Browser code execution is enabled for experimentation, but its security review is **not complete**. Do not execute untrusted or sensitive code.

**[Try the live playground](https://skmoniri.github.io/is-kit-playground/)** · **[is-kit documentation](https://is-kit.dev/en)** · **[is-kit repository](https://github.com/necoz-oss/is-kit)**

## What you can do

| Workspace | Purpose |
| --- | --- |
| **Guard Composer** | Select and combine guards (including AND, OR, and NOT), then test their behavior. |
| **Object Shape Builder** | Build and inspect structured object validation shapes. |
| **Collection Explorer** | Explore guards for arrays and collections. |
| **Union Explorer** | Experiment with union-style guard combinations. |
| **Type Narrowing** | See how type guard checks relate to TypeScript narrowing. |
| **Visual / Code modes** | Move between interactive controls and generated TypeScript. |
| **Editable TypeScript** | Modify examples, copy code, and run supported examples in the browser. |
| **Examples and sharing** | Start from guided presets, undo/redo changes, and share workspace state via a URL. |

The primary goal is to help newcomers discover is-kit while giving TypeScript developers a convenient place to prototype validation logic.

## How the playground works

1. Choose a workspace or an example.
2. Configure guards, object fields, or test values using the visual interface.
3. Inspect the generated TypeScript, switch to Code Mode where available, and copy the code into your own project.
4. For editable code, **Run Code** compiles TypeScript in a browser worker and sends the compiled JavaScript to a separate execution site. The execution result is returned to the playground and displayed in the output panel.

No account or application backend is needed for the current playground. The UI is a client-side React application.

### Why are there two websites?

**The playground and code-execution sandbox deliberately use different origins.**

| Component | Source | Live URL |
| --- | --- | --- |
| **Playground UI** | This repository | [skmoniri.github.io/is-kit-playground](https://skmoniri.github.io/is-kit-playground/) |
| **Execution sandbox** | The `sandbox/` directory in this repository; deployed by [is-kit-sandbox/is-kit-sandbox.github.io](https://github.com/is-kit-sandbox/is-kit-sandbox.github.io) | [is-kit-sandbox.github.io](https://is-kit-sandbox.github.io/) |

The playground uses a hidden iframe and `MessageChannel` to communicate with the sandbox. The sandbox checks the expected parent origin, creates a worker to evaluate the compiled example, and returns console output or an error. Execution requests have size limits and timeouts.

A separate **origin** matters; placing both apps at different paths on the *same* GitHub Pages domain would not provide the same origin separation.

**Security limitation:** Origin separation is only one defense. The current sandbox executes JavaScript using `new Function()`, and GitHub Pages does **not** serve the custom HTTP Content-Security-Policy headers defined for other hosting environments. In particular, worker-level network isolation has not been verified on GitHub Pages. The HTML CSP and iframe attributes must **not** be treated as proof that arbitrary untrusted code is safely contained. A thorough security review and adversarial tests are still needed before considering public execution production-safe.

## Tech stack

- React, TypeScript, Vite, and Tailwind CSS
- [is-kit](https://github.com/necoz-oss/is-kit) for runtime type guards
- Web Workers, an isolated iframe, and `MessageChannel` for the code-execution flow
- GitHub Actions and GitHub Pages for the published demo

## Run locally

**Requirements:** Node.js 22+ and npm. Use two terminals because the playground and sandbox are separate Vite applications.

```bash
git clone https://github.com/skmoniri/is-kit-playground.git
cd is-kit-playground
npm ci
```

**Terminal 1 — start the sandbox:**

```bash
npm run build:sandbox
npx vite --config sandbox/vite.config.ts
```

Sandbox: **http://127.0.0.1:3001**

**Terminal 2 — start the playground:**

```bash
npm run dev
```

Playground: **http://127.0.0.1:3000**

The local playground defaults to `http://127.0.0.1:3001` for sandbox execution, and the sandbox defaults to trusting `http://127.0.0.1:3000` as its parent. Use **127.0.0.1** consistently; `localhost` is a different origin for browser security checks.

> The local development server uses sandbox CSP response headers from `sandbox/vite.config.ts`. Local success does not establish that a GitHub Pages deployment enforces the same protections.

### Useful commands

```bash
npm run dev            # Start playground development server
npm run build          # Type-check and build playground into dist/
npm run build:sandbox  # Build execution sandbox into dist-sandbox/
npm run preview        # Preview a built playground
npm run lint           # Run ESLint
```

## Deploy your own copy

The UI and sandbox can be hosted independently on static hosting platforms, but **they must use different origins** if you enable execution.

### 1. Deploy the playground

Fork or clone this repository into your own GitHub account and enable **Settings → Pages → Source: GitHub Actions**.

This repository already includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the UI and deploys `dist/`.

Set the workflow's build environment variables for your deployment:

```yaml
env:
  VITE_BASE_PATH: /YOUR_REPOSITORY_NAME/
  VITE_SANDBOX_URL: https://YOUR-SEPARATE-SANDBOX-ORIGIN.example
```

- `VITE_BASE_PATH` is the Vite asset base path. Use `/` for an origin-root site; use `/repo-name/` for a GitHub Pages project site.
- `VITE_SANDBOX_URL` must be the **HTTPS origin** of your separately deployed sandbox, with no path, query, or hash.
- Both values are **build-time** Vite variables; changing them requires rebuilding the UI.

If you only want the visual playground, disable the code-execution control before deploying rather than pointing it at an untrusted sandbox.

### 2. Deploy the sandbox separately

The sandbox's source code lives under [`sandbox/`](sandbox/) in this repository. The [separate sandbox deployment repository](https://github.com/is-kit-sandbox/is-kit-sandbox.github.io) checks out this source and runs:

```bash
npm ci
npm run build:sandbox
```

The sandbox build must have the **parent site's origin** configured, e.g.:

```yaml
env:
  VITE_PARENT_ORIGIN: https://YOUR_USERNAME.github.io
```

Use the origin only — **no** `/repository/` path. The compiled sandbox checks that origin when accepting initialization messages.

Deploy the generated **`dist-sandbox/`** directory at the root of a **different origin**. For the current demo, that is an organization Pages site at `https://is-kit-sandbox.github.io/`.

> **Important:** Do not assume that copying the sandbox to GitHub Pages gives it production-grade isolation. GitHub Pages does not apply custom headers from `sandbox/public/_headers`, including the worker CSP. Before offering general-purpose code execution to others, use a hosting/security architecture that can enforce and verify the necessary restrictions, and test it against hostile input.

### 3. Connect and test

1. Build/deploy the sandbox with `VITE_PARENT_ORIGIN` set to the main site's exact origin.
2. Build/deploy the UI with `VITE_SANDBOX_URL` set to the sandbox's exact origin.
3. Open the main UI, use **Code Mode**, and try a simple trusted example.
4. Verify that compilation, output, stop behavior, timeout handling, and origin checks work. Passing a simple example is **not** a complete security audit.

### Using is-kit in another application

The generated TypeScript examples are designed to be copied into your own TypeScript project. Install the library there:

```bash
npm install is-kit
```

See the [official is-kit documentation](https://is-kit.dev/en) for its public APIs and usage. This repository is an interactive demo application, **not** a published or drop-in playground component package.

## Project status

This project is in **alpha**. The visual exploration workflows and a working browser-execution proof of concept are available. The execution sandbox's security model, browser compatibility, accessibility, error handling, and documentation still need further testing and refinement.

Contributions, reproducible bug reports, and suggestions for clearer guard-building workflows are welcome via [GitHub Issues](https://github.com/skmoniri/is-kit-playground/issues).

## Acknowledgments

Built as an independent companion to [is-kit](https://github.com/necoz-oss/is-kit), maintained by the [Necoz](https://github.com/necoz-oss) open-source community. Thanks to the maintainers for making the library available and encouraging experimentation.

---
**Independent alpha project. Not an official is-kit or Necoz release.**

## Testing

The project uses Playwright for automated browser testing.

```bash
npm run lint
npm run build
npm audit --omit=dev
npx playwright test
```

The Playwright configuration uses an installed Google Chrome browser.

The automated tests cover:

- Sandbox origin isolation and CSP restrictions
- Worker execution, timeouts, and recovery
- Guard Composer and visual explorers
- Validation and generated TypeScript
- Undo, redo, and workspace controls
- Shareable URL restoration
- Basic mobile and tablet responsiveness

These tests do not constitute a comprehensive security or accessibility audit.
