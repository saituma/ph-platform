import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

const shouldRun = Boolean(email && password);

test.describe("subscription flow", () => {
  test.skip(!shouldRun, "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD not set");

  test("signup -> login -> purchase -> subscription", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/parent/billing");
    await expect(page.getByRole("heading", { name: /billing/i })).toBeVisible();
  });
});
