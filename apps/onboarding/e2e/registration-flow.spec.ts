import { test, expect } from "@playwright/test";

test.describe("Registration Flow", () => {
  test("register page renders with email input and submit button", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(
      page.getByPlaceholder(/email/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /get started/i }),
    ).toBeVisible();
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.goto("/register");
    const emailInput = page.getByPlaceholder(/email/i).first();
    await emailInput.fill("notanemail");
    await page.getByRole("button", { name: /get started/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("shows duplicate account toast on 409", async ({ page }) => {
    await page.route("**/api/auth/register/start", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "Account already exists" }),
      }),
    );

    await page.goto("/register");
    const emailInput = page.getByPlaceholder(/email/i).first();
    await emailInput.fill("existing@example.com");
    await page.getByRole("button", { name: /get started/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("successful registration redirects to verification", async ({
    page,
  }) => {
    await page.route("**/api/auth/register/start", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );

    await page.goto("/register");
    const emailInput = page.getByPlaceholder(/email/i).first();
    await emailInput.fill("newuser@example.com");
    await page.getByRole("button", { name: /get started/i }).click();

    await expect(page).toHaveURL(/\/verification/, { timeout: 5000 });
  });

  test("stores pending email in localStorage on success", async ({
    page,
  }) => {
    await page.route("**/api/auth/register/start", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );

    await page.goto("/register");
    const emailInput = page.getByPlaceholder(/email/i).first();
    await emailInput.fill("test@example.com");
    await page.getByRole("button", { name: /get started/i }).click();

    await expect(page).toHaveURL(/\/verification/, { timeout: 5000 });
    const stored = await page.evaluate(() =>
      localStorage.getItem("pending_email"),
    );
    expect(stored).toBe("test@example.com");
  });

  test("preserves referral code from URL", async ({ page }) => {
    await page.goto("/register?ref=COACH123");
    const stored = await page.evaluate(() =>
      localStorage.getItem("pending_referral"),
    );
    expect(stored).toBe("COACH123");
  });

  test("sign in link navigates to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByText(/sign in/i).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});
