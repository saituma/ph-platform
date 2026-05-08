import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
    });
  });

  test("loads and shows hero content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible();
    await expect(
      page.locator("nav").getByRole("link").first(),
    ).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("nav")
      .getByRole("link", { name: /about/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/about/);
  });

  test.skip("visual regression - desktop", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("homepage-desktop.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test.skip("visual regression - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("homepage-mobile.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
