import { test, expect } from "@playwright/test";

test.describe("Error Pages", () => {
  test("404 page shows for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText(/not found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();
  });

  test("404 page has role=alert for accessibility", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("404 go home link navigates to homepage", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await page.getByRole("link", { name: /go home/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("skip to content link is present", async ({ page }) => {
    await page.goto("/about");
    const skipLink = page.getByText("Skip to main content");
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  test("main content landmark exists", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("route announcer updates on navigation", async ({ page }) => {
    await page.goto("/about");
    const announcer = page.getByRole("status");
    await expect(announcer).toContainText("about");
  });
});
