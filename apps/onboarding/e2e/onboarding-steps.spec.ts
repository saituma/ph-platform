import { test, expect } from "@playwright/test";

function seedSession(opts: {
  email?: string;
  userType?: string;
  token?: string;
}) {
  return async ({ page }: { page: any }) => {
    await page.addInitScript(
      (o: typeof opts) => {
        if (o.email) localStorage.setItem("pending_email", o.email);
        if (o.userType) localStorage.setItem("user_type", o.userType);
        if (o.token) localStorage.setItem("ph_auth_token", o.token);
      },
      opts,
    );

    await page.route("**/api/app/token-status", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }),
      }),
    );
  };
}

test.describe("Onboarding Step 1 — Account Setup", () => {
  test.beforeEach(
    seedSession({
      email: "test@example.com",
      token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake",
    }),
  );

  test("renders user type cards and password fields", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    await expect(page.getByText("Youth Athlete")).toBeVisible();
    await expect(page.getByText("Adult Athlete")).toBeVisible();
    await expect(page.getByText("Team / Club")).toBeVisible();
    await expect(page.getByText("Setup your Account")).toBeVisible();
  });

  test("user type selection shows aria-pressed state", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    const youthBtn = page.getByRole("button", { name: /youth athlete/i });
    await expect(youthBtn).toHaveAttribute("aria-pressed", "false");
    await youthBtn.click();
    await expect(youthBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("password fields appear after selecting user type", async ({
    page,
  }) => {
    await page.goto("/onboarding/step-1");
    await expect(page.getByLabel("Create Password")).not.toBeVisible();

    await page.getByRole("button", { name: /adult athlete/i }).click();
    await expect(page.getByLabel("Create Password")).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
  });

  test("password toggle buttons have accessible labels", async ({
    page,
  }) => {
    await page.goto("/onboarding/step-1");
    await page.getByRole("button", { name: /youth athlete/i }).click();

    const showBtn = page.getByRole("button", { name: /show password$/i });
    await expect(showBtn).toBeVisible();
    await showBtn.click();
    await expect(
      page.getByRole("button", { name: /hide password$/i }),
    ).toBeVisible();
  });

  test("password requirements update as user types", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    await page.getByRole("button", { name: /adult athlete/i }).click();

    await page.getByLabel("Create Password").fill("Str0ng!Pass");
    await expect(page.getByText("8+ Characters")).toBeVisible();
    await expect(page.getByText("Uppercase Letter")).toBeVisible();
    await expect(page.getByText("One Number")).toBeVisible();
    await expect(page.getByText("Special Character")).toBeVisible();
  });

  test("continue button disabled until all requirements met", async ({
    page,
  }) => {
    await page.goto("/onboarding/step-1");
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await expect(continueBtn).toBeDisabled();

    await page.getByRole("button", { name: /adult athlete/i }).click();
    await expect(continueBtn).toBeDisabled();

    await page.getByLabel("Create Password").fill("Str0ng!Pass");
    await expect(continueBtn).toBeDisabled();

    await page.getByLabel("Confirm Password").fill("Str0ng!Pass");
    await expect(continueBtn).toBeEnabled();
  });

  test("mismatched passwords show error", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    await page.getByRole("button", { name: /adult athlete/i }).click();
    await page.getByLabel("Create Password").fill("Str0ng!Pass");
    await page.getByLabel("Confirm Password").fill("Different1!");
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });
});

test.describe("Onboarding Step 2 — Basic Information", () => {
  test.beforeEach(
    seedSession({
      email: "test@example.com",
      userType: "adult",
      token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake",
    }),
  );

  test("renders adult form fields", async ({ page }) => {
    await page.goto("/onboarding/step-2");
    await expect(page.getByText("Basic Information")).toBeVisible();
    await expect(page.getByLabel(/your full name/i)).toBeVisible();
  });

  test("back button navigates to step-1", async ({ page }) => {
    await page.goto("/onboarding/step-2");
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/step-1/);
  });
});

test.describe("Onboarding Step 2 — Youth", () => {
  test.beforeEach(
    seedSession({
      email: "test@example.com",
      userType: "youth",
      token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake",
    }),
  );

  test("renders youth-specific fields", async ({ page }) => {
    await page.goto("/onboarding/step-2");
    await expect(
      page.getByLabel(/your full name.*guardian/i),
    ).toBeVisible();
    await expect(page.getByLabel(/athlete.*full name/i)).toBeVisible();
  });
});

test.describe("Onboarding Step 2 — Team", () => {
  test.beforeEach(
    seedSession({
      email: "test@example.com",
      userType: "team",
      token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake",
    }),
  );

  test("renders team-specific fields", async ({ page }) => {
    await page.goto("/onboarding/step-2");
    await expect(page.getByLabel(/team.*club name/i)).toBeVisible();
    await expect(
      page.getByLabel(/expected number of athletes/i),
    ).toBeVisible();
  });

  test("team type toggle between youth and adult", async ({ page }) => {
    await page.goto("/onboarding/step-2");
    await expect(page.getByText("Youth Team")).toBeVisible();
    await expect(page.getByText("Adult Team")).toBeVisible();

    // Youth team should show age range fields
    await page.getByText("Youth Team").click();
    await expect(page.getByLabel(/min age/i)).toBeVisible();
    await expect(page.getByLabel(/max age/i)).toBeVisible();

    // Adult team hides age range
    await page.getByText("Adult Team").click();
    await expect(page.getByLabel(/min age/i)).not.toBeVisible();
  });
});

test.describe("Onboarding Step 3 — Training & Goals", () => {
  test.beforeEach(
    seedSession({
      email: "test@example.com",
      userType: "adult",
      token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake",
    }),
  );

  test("renders training fields", async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: {} }),
      }),
    );

    await page.goto("/onboarding/step-3");
    await expect(page.getByText("Training & Goals")).toBeVisible();
    await expect(page.getByLabel(/performance goals/i)).toBeVisible();
    await expect(page.getByLabel(/phone/i).first()).toBeVisible();
  });

  test("equipment options are selectable", async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: {} }),
      }),
    );

    await page.goto("/onboarding/step-3");
    await expect(page.getByText("Full Gym")).toBeVisible();
    await expect(page.getByText("Home Gym")).toBeVisible();
    await expect(page.getByText("No Equipment")).toBeVisible();
  });

  test("training day buttons are interactive", async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: {} }),
      }),
    );

    await page.goto("/onboarding/step-3");
    await expect(page.getByText("Mon")).toBeVisible();
    await expect(page.getByText("Sun")).toBeVisible();
  });

  test("country code picker has accessible attributes", async ({
    page,
  }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: {} }),
      }),
    );

    await page.goto("/onboarding/step-3");
    const countryBtn = page.getByRole("button", {
      name: /country code/i,
    });
    await expect(countryBtn).toHaveAttribute("aria-expanded", "false");

    await countryBtn.click();
    await expect(countryBtn).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("listbox")).toBeVisible();
  });
});
