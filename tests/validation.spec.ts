import { test, expect } from "@playwright/test";

const URL = "https://skmoniri.github.io/is-kit-playground/";

test.beforeEach(async ({ page }) => {
  await page.goto(URL);

  // Select AND using the component's CSS class.
  await page.locator(".operator-button").filter({ hasText: "and()" }).click();

  // Keep one guard for predictable results.
  await page
    .getByRole("button", {
      name: "Remove guard 2",
    })
    .click();

  // Configure the remaining guard as isString.
  await page
    .getByRole("combobox", {
      name: "Guard 1",
    })
    .selectOption("isString");
});

test("accepts a valid string", async ({ page }) => {
  await page
    .getByRole("textbox", {
      name: "JSON test input",
    })
    .fill('"hello"');

  await expect(page.locator(".compact-result-status")).toHaveText("VALID");
});

test("rejects a number when expecting a string", async ({ page }) => {
  await page
    .getByRole("textbox", {
      name: "JSON test input",
    })
    .fill("42");

  await expect(page.locator(".compact-result-status")).toHaveText("INVALID");
});

test("handles malformed JSON without crashing", async ({ page }) => {
  await page
    .getByRole("textbox", {
      name: "JSON test input",
    })
    .fill('{"broken":');

  await expect(page.locator(".compact-result-status")).toHaveText("ERROR");

  await expect(
    page.getByRole("button", {
      name: "Show details",
    }),
  ).toBeVisible();
});

test("generates TypeScript using the selected guard", async ({ page }) => {
  const generatedCode = page.locator(".code-panel pre code");

  await expect(generatedCode).toBeVisible();
  await expect(generatedCode).toContainText("isString");
  await expect(generatedCode).not.toBeEmpty();
});

test("validation details can be expanded", async ({ page }) => {
  const toggle = page.getByRole("button", {
    name: "Show details",
  });

  await toggle.click();

  await expect(page.getByText("GUARD EVALUATION")).toBeVisible();

  await expect(page.getByText("PARSING RESULT")).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Hide details",
    }),
  ).toHaveAttribute("aria-expanded", "true");

  await page
    .getByRole("button", {
      name: "Hide details",
    })
    .click();

  await expect(page.getByText("GUARD EVALUATION")).toBeHidden();

  await expect(
    page.getByRole("button", {
      name: "Show details",
    }),
  ).toHaveAttribute("aria-expanded", "false");
});
