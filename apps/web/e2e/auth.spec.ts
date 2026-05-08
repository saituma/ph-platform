import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads and shows the login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("text=Admin Login")).toBeVisible();
    await expect(page.locator("text=Sign in to access the dashboard")).toBeVisible();
  });

  test("login form has email and password fields", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");

    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("placeholder", "you@example.com");

    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("password visibility toggle works", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator("#password");
    const toggleButton = page.getByRole("button", { name: /show password|hide password/i });

    await expect(passwordInput).toHaveAttribute("type", "password");

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("submit button is present and labeled", async ({ page }) => {
    await page.goto("/login");

    const submitButton = page.getByRole("button", { name: /sign in/i });
    await expect(submitButton).toBeVisible();
  });

  test("email field enforces required validation", async ({ page }) => {
    await page.goto("/login");

    // Try submitting with empty fields — HTML5 validation should prevent it
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");

    // Fill only password, leave email empty
    await passwordInput.fill("somepassword");

    const submitButton = page.getByRole("button", { name: /sign in/i });
    // The button may be disabled due to Turnstile, but the required attribute should still be on the input
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("password field enforces required validation", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator("#password");
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("shows error on failed login attempt", async ({ page }) => {
    // Mock the login API to return an error
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid credentials" }),
      });
    });

    // Also mock Turnstile so the button is not disabled
    await page.addInitScript(() => {
      (window as any).__PLAYWRIGHT_BYPASS_TURNSTILE = true;
    });

    await page.goto("/login");

    // Fill the form
    await page.locator("#email").fill("bad@example.com");
    await page.locator("#password").fill("wrongpassword");

    // Since Turnstile may block submission, force-enable the button
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button[type="submit"]');
      buttons.forEach((btn) => btn.removeAttribute("disabled"));
    });

    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for the error alert to appear
    await expect(page.locator("text=Invalid credentials")).toBeVisible({ timeout: 10_000 });
  });

  test("redirects to /login when accessing protected route without auth", async ({ page }) => {
    // Access a protected page without any auth cookies
    await page.goto("/users");

    // Should be redirected to login
    await page.waitForURL("**/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects to /login when accessing dashboard without auth", async ({ page }) => {
    await page.goto("/");

    await page.waitForURL("**/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page shows PH Performance branding", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('img[alt="PH Performance"]')).toBeVisible();
    await expect(page.locator("text=PH Performance")).toBeVisible();
  });
});
