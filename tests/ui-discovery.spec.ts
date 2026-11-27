import { test } from "@playwright/test";

const URL = "https://skmoniri.github.io/is-kit-playground/";

test("discover playground UI", async ({ page }) => {
  await page.goto(URL);

  const navigation = await page.locator("button").allTextContents();

  console.log("\n=== BUTTONS ===");
  console.log(navigation.map((text) => text.trim()).filter(Boolean));

  console.log("\n=== INPUTS ===");
  console.log(
    await page.locator("input, textarea, select").evaluateAll((elements) =>
      elements.map((element) => ({
        tag: element.tagName,
        label: element.getAttribute("aria-label"),
        placeholder: element.getAttribute("placeholder"),
      })),
    ),
  );

  console.log("\n=== HEADINGS ===");
  console.log(await page.locator("h1, h2, h3").allTextContents());

  const sidebar = [
    "Guard Composer",
    "Object Shape Builder",
    "Collection Guard Explorer",
    "Type Narrowing",
  ];

  for (const name of sidebar) {
    const button = page.getByRole("button", {
      name,
      exact: true,
    });

    if ((await button.count()) === 0) {
      console.log(`\n=== ${name}: BUTTON NOT FOUND ===`);
      continue;
    }

    await button.click();

    console.log(`\n=== ${name.toUpperCase()} ===`);

    console.log("Buttons:", (
      await page.locator("button:visible").allTextContents()
    ).map((text) => text.trim()).filter(Boolean));

    console.log(
      "Inputs:",
      await page.locator("input:visible, textarea:visible, select:visible")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            tag: element.tagName,
            label: element.getAttribute("aria-label"),
            placeholder: element.getAttribute("placeholder"),
          })),
        ),
    );
  }
});
