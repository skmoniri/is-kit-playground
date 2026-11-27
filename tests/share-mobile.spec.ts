import { test, expect, type Page } from "@playwright/test";

const URL = "https://skmoniri.github.io/is-kit-playground/";

async function checkHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 2;
  });
}

test("share link restores the selected guard and input", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(URL);

  await page.getByRole("combobox", {
    name: "Guard 1",
  }).selectOption("isBoolean");

  await page.getByRole("textbox", {
    name: "JSON test input",
  }).fill("true");

  await page.getByRole("button", {
    name: "Copy shareable playground link",
  }).click();

  await expect(
    page.getByText("Shareable link copied."),
  ).toBeVisible();

  const sharedUrl = await page.evaluate(() =>
    navigator.clipboard.readText()
  );

  expect(sharedUrl).toContain("is-kit-playground");

  await page.goto(sharedUrl);

  await expect(
    page.getByRole("combobox", {
      name: "Guard 1",
    }),
  ).toHaveValue("isBoolean");

  await expect(
    page.getByRole("textbox", {
      name: "JSON test input",
    }),
  ).toHaveValue("true");
});

test("mobile layout at 375px has no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({
    width: 375,
    height: 812,
  });

  await page.goto(URL);

  await expect(
    page.getByRole("heading", {
      name: "Guard Composer",
    }),
  ).toBeVisible();

  expect(await checkHorizontalOverflow(page)).toBe(false);
});

test("mobile editor accepts input", async ({ page }) => {
  await page.setViewportSize({
    width: 375,
    height: 812,
  });

  await page.goto(URL);

  const input = page.getByRole("textbox", {
    name: "JSON test input",
  });

  await input.fill('"mobile test"');

  await expect(input).toHaveValue('"mobile test"');
});

test("tablet layout at 768px has no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({
    width: 768,
    height: 1024,
  });

  await page.goto(URL);

  expect(await checkHorizontalOverflow(page)).toBe(false);
});

test("mobile workspace controls remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({
    width: 375,
    height: 812,
  });

  await page.goto(URL);

  await expect(
    page.getByRole("button", {
      name: "Reset",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Copy shareable playground link",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("textbox", {
      name: "JSON test input",
    }),
  ).toBeVisible();
});
