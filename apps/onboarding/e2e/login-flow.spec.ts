import { test, expect } from "@playwright/test";

const VALID_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInN1YiI6IjEifQ.test";

test.describe("Login Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
    });
  });

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
      page.getByText("Login failed"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("successful login redirects to portal", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: VALID_JWT,
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

    await page.route("**/api/app/set-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );

    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: 1,
            name: "Test",
            email: "test@example.com",
            role: "athlete",
            onboardingCompleted: true,
            programTier: "gold",
            planExpiresAt: null,
          },
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

    await expect(page).toHaveURL(/\/portal/, { timeout: 10000 });
  });

  test("create account link navigates to register", async ({ page }) => {
    await page.goto("/login");
    await page
      .locator("a")
      .filter({ hasText: /create account/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("remember me checkbox is present", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/keep me signed in/i)).toBeVisible();
  });
});
