import { expect, test } from "@playwright/test";

for (const width of [1440, 768, 375]) {
  test(`guard columns stay aligned at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Guard Composer", exact: true }).click();

    const rows = page.locator(".guard-row");
    async function checkAlignment() {
      const positions = await rows.evaluateAll((elements) => elements.map((row) => ({
        select: row.querySelector(".guard-select-wrap")!.getBoundingClientRect().left,
        description: row.querySelector(".guard-description")!.getBoundingClientRect().left,
      })));
      for (const position of positions.slice(1)) {
        expect(position.select).toBeCloseTo(positions[0].select, 1);
        if (width > 1100) expect(position.description).toBeCloseTo(positions[0].description, 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }

    await checkAlignment();
    await rows.first().locator("select").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Add another guard" }).click();
    await page.locator(".picker-option").first().click();
    await checkAlignment();
    await rows.last().getByRole("button", { name: /Remove guard/ }).click();
    await checkAlignment();

    // Exercise long indices without creating thousands of live guard controls.
    await rows.last().locator(".guard-number").evaluate((number) => { number.textContent = "1000"; });
    await checkAlignment();
  });
}
