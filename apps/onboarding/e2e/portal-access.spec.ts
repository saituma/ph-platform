import { test, expect } from "@playwright/test";

test.describe("Portal Access Gating", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.route("**/api/app/token-status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false, expiresAt: null }),
      }),
    );

    await page.goto("/portal/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("authenticated user without subscription sees onboarding gate", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

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

    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            role: "athlete",
            onboardingCompleted: false,
            programTier: null,
            planExpiresAt: null,
          },
        }),
      }),
    );

    await page.goto("/portal/dashboard");
    await expect(
      page.getByText(/finish onboarding|action required/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("onboarding gate shows missing fields for athlete", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

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

    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            role: "athlete",
            onboardingCompleted: false,
            birthDate: null,
            trainingPerWeek: 0,
            performanceGoals: "",
            phoneNumber: "",
            equipmentAccess: "",
          },
        }),
      }),
    );

    await page.goto("/portal/dashboard");
    await expect(page.getByText("Birth date")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Training frequency")).toBeVisible();
    await expect(page.getByText("Performance goals")).toBeVisible();
  });

  test("onboarding gate shows continue button to correct step", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

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

    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            role: "athlete",
            onboardingCompleted: false,
            birthDate: "2000-01-01",
            trainingPerWeek: 3,
            performanceGoals: "Get faster",
            phoneNumber: "+447911123456",
            equipmentAccess: "full",
          },
        }),
      }),
    );

    await page.goto("/portal/dashboard");
    await expect(
      page.getByRole("button", { name: /continue step 4/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("onboarding gate has log out button", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

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
            onboardingCompleted: false,
          },
        }),
      }),
    );

    await page.goto("/portal/dashboard");
    await expect(
      page.getByRole("button", { name: /log out/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("401 from API redirects to login", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

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

    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      }),
    );

    await page.goto("/portal/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("in-review status shows awaiting approval", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

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
            programTier: null,
          },
        }),
      }),
    );

    await page.route("**/api/billing/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          latestRequest: { status: "pending_approval" },
        }),
      }),
    );

    await page.goto("/portal/dashboard");
    await expect(page.getByText(/in review|awaiting/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
