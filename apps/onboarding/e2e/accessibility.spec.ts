import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("skip link is present and works", async ({ page }) => {
    await page.goto("/about");
    const skipLink = page.getByText("Skip to main content");
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
  });

  test("pages have proper heading hierarchy", async ({ page }) => {
    await page.goto("/about");
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
  });
});
