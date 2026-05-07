import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("login page renders email, password, and submit", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome Back")).toBeVisible();
    await expect(
      page.getByPlaceholder(/email/i).first(),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/password/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("shows validation error on empty email submit", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid email or password" }),
      }),
    );

    await page.goto("/login");
    await page.getByPlaceholder(/email/i).first().fill("test@example.com");
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill("WrongPass1!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(
      page.getByText(/invalid|failed|incorrect/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test("successful login redirects to portal", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "fake-jwt-token",
          user: { id: 1, name: "Test", email: "test@example.com" },
        }),
      }),
    );

    await page.route("**/api/app/token-status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }),
      }),
    );

    await page.goto("/login");
    await page.getByPlaceholder(/email/i).first().fill("test@example.com");
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill("Str0ng!Pass");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/portal/, { timeout: 5000 });
  });

  test("create account link navigates to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByText(/create account/i).first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("remember me checkbox is present", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/keep me signed in/i)).toBeVisible();
  });
});
