import { test, expect, type Page } from "@playwright/test";

const URL = "https://skmoniri.github.io/is-kit-playground/";

async function openMode(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
});

test("all five visual explorers are accessible", async ({ page }) => {
  const modes = [
    "Guard Composer",
    "Object Shape Builder",
    "Collection Explorer",
    "Union Explorer",
    "Type Narrowing",
  ];

  for (const mode of modes) {
    await openMode(page, mode);

    await expect(
      page.getByRole("button", {
        name: mode,
        exact: true,
      }),
    ).toBeVisible();
  }
});

test("guard composer can add a guard", async ({ page }) => {
  const guards = page.locator('select[aria-label^="Guard "]');
  const before = await guards.count();

  await page
    .getByRole("button", {
      name: /Add another guard/,
    })
    .click();

  const search = page.getByRole("textbox", {
    name: "Search guards",
  });

  await expect(search).toBeVisible();

  await search.fill("isString");

  await page
    .getByRole("button", {
      name: /isString/,
    })
    .click();

  await expect(guards).toHaveCount(before + 1);
});

test("object shape builder can add a property", async ({ page }) => {
  await openMode(page, "Object Shape Builder");

  const fields = page.locator('input[placeholder="Property name"]');
  const before = await fields.count();

  await page
    .getByRole("button", {
      name: /Add property/,
    })
    .click();

  await expect(fields).toHaveCount(before + 1);
});

test("collection explorer loads", async ({ page }) => {
  await openMode(page, "Collection Explorer");

  await expect(page.locator("select:visible").first()).toBeVisible();
});

test("union explorer loads", async ({ page }) => {
  await openMode(page, "Union Explorer");

  await expect(page.locator("select:visible").first()).toBeVisible();
});

test("type narrowing explorer loads", async ({ page }) => {
  await openMode(page, "Type Narrowing");

  await expect(page.locator("select:visible").first()).toBeVisible();
});

test("code mode opens the TypeScript editor", async ({ page }) => {
  await openMode(page, "Code Mode");

  await expect(
    page.getByRole("textbox", {
      name: "Editable TypeScript source code",
    }),
  ).toBeVisible();
});

test("visual mode can be restored", async ({ page }) => {
  await openMode(page, "Code Mode");
  await openMode(page, "Visual Mode");

  await expect(
    page.getByRole("textbox", {
      name: "JSON test input",
    }),
  ).toBeVisible();
});

test("JSON test input accepts edited values", async ({ page }) => {
  const input = page.getByRole("textbox", {
    name: "JSON test input",
  });

  await input.fill('"hello"');

  await expect(input).toHaveValue('"hello"');
});

test("undo and redo restore input changes", async ({ page }) => {
  const input = page.getByRole("textbox", {
    name: "JSON test input",
  });

  const original = await input.inputValue();

  await input.fill('"changed"');

  await page
    .getByRole("button", {
      name: "Undo",
      exact: true,
    })
    .click();

  await expect(input).toHaveValue(original);

  await page
    .getByRole("button", {
      name: "Redo",
      exact: true,
    })
    .click();

  await expect(input).toHaveValue('"changed"');
});

test("reset restores the default workspace", async ({ page }) => {
  await openMode(page, "Object Shape Builder");

  await page
    .getByRole("button", {
      name: "Reset",
      exact: true,
    })
    .click();

  await expect(
    page.getByRole("button", {
      name: "Guard Composer",
      exact: true,
    }),
  ).toBeVisible();
});

test("guided example buttons are accessible", async ({ page }) => {
  const examples = [
    "Quick Start",
    "Numbers",
    "Boolean Values",
    "Not Nullish",
    "Objects",
    "Arrays",
  ];

  for (const example of examples) {
    await expect(
      page.getByRole("button", {
        name: example,
        exact: true,
      }),
    ).toBeVisible();
  }
});
