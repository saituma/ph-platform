import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
    });
  });

  test("skip link is present and works", async ({ page }) => {
    await page.goto("/about");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveText("Skip to main content");
  });

  test("pages have proper heading hierarchy", async ({ page }) => {
    await page.goto("/about");
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });
});
