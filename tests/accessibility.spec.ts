import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const URL = "https://skmoniri.github.io/is-kit-playground/";

const workspaces = [
  "Guard Composer",
  "Object Shape Builder",
  "Collection Explorer",
  "Union Explorer",
  "Type Narrowing",
];

test("main playground has no critical accessibility violations", async ({
  page,
}) => {
  await page.goto(URL);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});

for (const workspace of workspaces) {
  test(`${workspace} accessibility`, async ({ page }) => {
    await page.goto(URL);

    await page.getByRole("button", { name: workspace, exact: true }).click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const violations = results.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    );

    expect(violations).toEqual([]);
  });
}

test("Code Mode accessibility", async ({ page }) => {
  await page.goto(URL);

  await page.getByRole("button", { name: "Code Mode" }).click();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});
