import { test, expect } from "@playwright/test";

function setupPortalMocks(
  page: any,
  opts: {
    authenticated?: boolean;
    user?: Record<string, any> | null;
    meStatus?: number;
    billingStatus?: Record<string, any> | null;
  } = {},
) {
  const {
    authenticated = true,
    user = null,
    meStatus = 200,
    billingStatus = null,
  } = opts;

  return Promise.all([
    page.route("**/api/app/token-status", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated,
          expiresAt: authenticated
            ? Math.floor(Date.now() / 1000) + 3600
            : null,
        }),
      }),
    ),
    page.route("**/api/app/set-token", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    ),
    page.route("**/api/app/clear-token", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    ),
    user !== null || meStatus !== 200
      ? page.route("**/api/auth/me", (route: any) =>
          route.fulfill({
            status: meStatus,
            contentType: "application/json",
            body: JSON.stringify(
              meStatus === 200 ? { user } : { error: "Unauthorized" },
            ),
          }),
        )
      : Promise.resolve(),
    billingStatus !== null
      ? page.route("**/api/billing/status", (route: any) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(billingStatus),
          }),
        )
      : page.route("**/api/billing/status", (route: any) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
          }),
        ),
  ]);
}

test.describe("Portal Access Gating", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
    });
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await setupPortalMocks(page, { authenticated: false });
    await page.goto("/portal/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("authenticated user without subscription sees onboarding gate", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

    await setupPortalMocks(page, {
      user: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "athlete",
        onboardingCompleted: false,
        programTier: null,
        planExpiresAt: null,
      },
    });

    await page.goto("/portal/dashboard");
    await expect(
      page.getByText(/finish onboarding|action required/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("onboarding gate shows missing fields for athlete", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

    await setupPortalMocks(page, {
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
    });

    await page.goto("/portal/dashboard");
    await expect(page.getByText("Birth date")).toBeVisible({
      timeout: 15000,
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

    await setupPortalMocks(page, {
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
    });

    await page.goto("/portal/dashboard");
    await expect(
      page.getByRole("button", { name: /continue step 4/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("onboarding gate has log out button", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

    await setupPortalMocks(page, {
      user: {
        id: 1,
        name: "Test",
        email: "test@example.com",
        role: "athlete",
        onboardingCompleted: false,
      },
    });

    await page.goto("/portal/dashboard");
    await expect(
      page.getByRole("button", { name: /log out/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("401 from API redirects to login", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

    await setupPortalMocks(page, { meStatus: 401 });

    await page.goto("/portal/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("in-review status shows awaiting approval", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph_auth_token", "fake-token");
    });

    await setupPortalMocks(page, {
      user: {
        id: 1,
        name: "Test",
        email: "test@example.com",
        role: "athlete",
        onboardingCompleted: true,
        programTier: null,
      },
      billingStatus: {
        latestRequest: { status: "pending_approval" },
      },
    });

    await page.goto("/portal/dashboard");
    await expect(
      page.getByText(/in review|awaiting/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
