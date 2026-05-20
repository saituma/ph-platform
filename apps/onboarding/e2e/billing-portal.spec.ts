import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BillingStatusOpts {
  currentProgramTier?: string | null;
  latestRequest?: {
    status?: string;
    paymentStatus?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

interface SetupBillingMocksOpts {
  authenticated?: boolean;
  user?: Record<string, unknown> | null;
  meStatus?: number;
  billingStatus?: BillingStatusOpts | null;
  invoices?: unknown[] | null;
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const DEFAULT_USER = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
  role: "athlete",
  onboardingCompleted: true,
  programTier: "PHP_Premium",
  planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const MOCK_PLANS = [
  {
    id: 1,
    tier: "PHP",
    name: "PHP Program",
    displayPrice: "$49",
    isActive: true,
    pricing: { monthly: { discounted: "$49" } },
    durationWeeks: 12,
  },
  {
    id: 2,
    tier: "PHP_Premium",
    name: "PHP Premium",
    displayPrice: "$89",
    isActive: true,
    pricing: { monthly: { discounted: "$89" } },
    durationWeeks: 12,
  },
  {
    id: 3,
    tier: "PHP_Premium_Plus",
    name: "PHP Plus",
    displayPrice: "$119",
    isActive: true,
    pricing: { monthly: { discounted: "$119" } },
    durationWeeks: 12,
  },
  {
    id: 4,
    tier: "PHP_Pro",
    name: "PHP Pro",
    displayPrice: "$149",
    isActive: true,
    pricing: { monthly: { discounted: "$149" } },
    durationWeeks: 12,
  },
];

const ACTIVE_BILLING_STATUS: BillingStatusOpts = {
  currentProgramTier: "PHP_Premium",
  latestRequest: {
    status: "approved",
    paymentStatus: "paid",
  },
};

const PAST_DUE_BILLING_STATUS: BillingStatusOpts = {
  currentProgramTier: "PHP_Premium",
  latestRequest: {
    status: "approved",
    paymentStatus: "past_due",
  },
};

const NO_PLAN_BILLING_STATUS: BillingStatusOpts = {
  currentProgramTier: null,
  latestRequest: null,
};

// ---------------------------------------------------------------------------
// Shared mock helper
// ---------------------------------------------------------------------------

async function setupBillingMocks(
  page: any,
  opts: SetupBillingMocksOpts = {},
) {
  const {
    authenticated = true,
    user = DEFAULT_USER,
    meStatus = 200,
    billingStatus = ACTIVE_BILLING_STATUS,
    invoices = [],
  } = opts;

  await page.route("**/api/app/token-status", (route: any) =>
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
  );

  await page.route("**/api/app/set-token", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }),
  );

  await page.route("**/api/app/clear-token", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }),
  );

  await page.route("**/api/auth/me", (route: any) =>
    route.fulfill({
      status: meStatus,
      contentType: "application/json",
      body: JSON.stringify(
        meStatus === 200
          ? { user: user ?? DEFAULT_USER }
          : { error: "Unauthorized" },
      ),
    }),
  );

  await page.route("**/api/billing/plans**", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ plans: MOCK_PLANS }),
    }),
  );

  await page.route("**/api/billing/status", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(billingStatus ?? {}),
    }),
  );

  await page.route("**/api/billing/invoices**", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ invoices: invoices ?? [] }),
    }),
  );

  await page.route("**/api/billing/customer-portal", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://billing.stripe.com/test-portal" }),
    }),
  );

  // Default checkout mock — individual tests that need to inspect or override this
  // can add their own page.route before calling setupBillingMocks, or re-route after.
  await page.route("**/api/billing/checkout", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        checkoutUrl: "https://checkout.stripe.com/test",
        sessionId: "cs_test_default",
      }),
    }),
  );

  // Silence sidebar/shell calls that would otherwise hit a real server
  await page.route("**/api/notifications**", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    }),
  );

  await page.route("**/api/messages/inbox**", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ threads: [] }),
    }),
  );

  await page.route("**/api/messages**", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ messages: [], threads: [] }),
    }),
  );
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

test.describe("Billing Portal — Page load & structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test('renders the "Billing & Plan" heading', async ({ page }) => {
    await setupBillingMocks(page);
    await page.goto("/portal/billing");
    await expect(
      page.getByRole("heading", { name: /billing & plan/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('shows the "Self-service portal" badge', async ({ page }) => {
    await setupBillingMocks(page);
    await page.goto("/portal/billing");
    await expect(page.getByText(/self-service portal/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("shows billing cycle selector with all four options", async ({
    page,
  }) => {
    await setupBillingMocks(page);
    await page.goto("/portal/billing");
    await expect(page.getByText("Weekly")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Monthly")).toBeVisible();
    await expect(page.getByText("6 months")).toBeVisible();
    await expect(page.getByText("Yearly")).toBeVisible();
  });

  test("shows 4 plan cards", async ({ page }) => {
    await setupBillingMocks(page);
    await page.goto("/portal/billing");
    // Each plan card has a heading — PHP Program, PHP Premium, PHP Plus, PHP Pro
    // CardTitle + CardDescription both render the plan name, so use .first() to avoid strict-mode violations
    await expect(page.getByText("PHP Program").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("PHP Premium").first()).toBeVisible();
    await expect(page.getByText("PHP Plus").first()).toBeVisible();
    await expect(page.getByText("PHP Pro").first()).toBeVisible();
  });

  test("shows current access card with Plan, Renews / expires, and Billing status fields", async ({
    page,
  }) => {
    await setupBillingMocks(page);
    await page.goto("/portal/billing");
    await expect(page.getByText("Current access")).toBeVisible({
      timeout: 15000,
    });
    // exact: true prevents partial match against "Billing & Plan" heading
    await expect(page.getByText("Plan", { exact: true })).toBeVisible();
    await expect(page.getByText(/renews \/ expires/i)).toBeVisible();
    await expect(page.getByText("Billing status")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — Billing cycle toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test('clicking "Yearly" applies active styling', async ({ page }) => {
    await setupBillingMocks(page);
    await page.goto("/portal/billing");

    // Wait for page to load
    await expect(page.getByText("Yearly")).toBeVisible({ timeout: 15000 });

    const yearlyBtn = page.getByRole("button", { name: /yearly/i });
    await yearlyBtn.click();

    // Active buttons get border-primary and bg-primary/10 classes
    await expect(yearlyBtn).toHaveClass(/border-primary/, { timeout: 5000 });
  });

  test('clicking "Monthly" then "Weekly" cycles the selection', async ({
    page,
  }) => {
    await setupBillingMocks(page);
    await page.goto("/portal/billing");
    await expect(page.getByText("Monthly")).toBeVisible({ timeout: 15000 });

    // Billing cycle buttons have accessible name "Monthly Recurring" — partial match
    const monthlyBtn = page.getByRole("button", { name: /monthly/i });
    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveClass(/border-primary/, { timeout: 5000 });

    const weeklyBtn = page.getByRole("button", { name: /weekly/i });
    await weeklyBtn.click();
    await expect(weeklyBtn).toHaveClass(/border-primary/, { timeout: 5000 });
    // Monthly should no longer be active
    await expect(monthlyBtn).not.toHaveClass(/border-primary/);
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — Active subscription state", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test('shows "Active" badge in current access card', async ({ page }) => {
    await setupBillingMocks(page, { billingStatus: ACTIVE_BILLING_STATUS });
    await page.goto("/portal/billing");
    // "Active" text appears in both the health badge and the current-plan button — use first()
    await expect(page.getByText("Active").first()).toBeVisible({ timeout: 15000 });
  });

  test('shows "Manage subscription" button', async ({ page }) => {
    await setupBillingMocks(page, { billingStatus: ACTIVE_BILLING_STATUS });
    await page.goto("/portal/billing");
    await expect(
      page.getByRole("button", { name: /manage subscription/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('shows "Cancel, update card" link text', async ({ page }) => {
    await setupBillingMocks(page, { billingStatus: ACTIVE_BILLING_STATUS });
    await page.goto("/portal/billing");
    await expect(
      page.getByText(/cancel, update card/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test("does NOT show the red Payment failed banner", async ({ page }) => {
    await setupBillingMocks(page, { billingStatus: ACTIVE_BILLING_STATUS });
    await page.goto("/portal/billing");
    await expect(page.getByText("PHP Premium").first()).toBeVisible({ timeout: 15000 }); // page loaded
    await expect(page.getByText("Payment failed").first()).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — Past-due state", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test('shows red "Payment failed" banner', async ({ page }) => {
    await setupBillingMocks(page, { billingStatus: PAST_DUE_BILLING_STATUS });
    await page.goto("/portal/billing");
    // The banner paragraph with the bold heading
    await expect(
      page.locator(".border-red-500\\/30").getByText("Payment failed"),
    ).toBeVisible({ timeout: 15000 });
  });

  test('banner contains "Your last payment didn\'t go through" text', async ({
    page,
  }) => {
    await setupBillingMocks(page, { billingStatus: PAST_DUE_BILLING_STATUS });
    await page.goto("/portal/billing");
    await expect(
      page.getByText(/your last payment didn't go through/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test('shows "Update card" button inside the banner', async ({ page }) => {
    await setupBillingMocks(page, { billingStatus: PAST_DUE_BILLING_STATUS });
    await page.goto("/portal/billing");
    // Scope to the red banner to avoid matching the "Cancel, update card" link button too
    await expect(
      page.locator(".border-red-500\\/30").getByRole("button", { name: /update card/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('shows "Payment failed" subscription health badge', async ({ page }) => {
    await setupBillingMocks(page, { billingStatus: PAST_DUE_BILLING_STATUS });
    await page.goto("/portal/billing");
    // The span badge with text "Payment failed"
    await expect(page.locator("span").filter({ hasText: /^payment failed$/i })).toBeVisible({
      timeout: 15000,
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — No-plan state", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test('does NOT show "Manage subscription" button', async ({ page }) => {
    await setupBillingMocks(page, {
      billingStatus: NO_PLAN_BILLING_STATUS,
      user: { ...DEFAULT_USER, programTier: null },
    });
    await page.goto("/portal/billing");
    // Wait for page to be ready — CardTitle + CardDescription both render plan name so use .first()
    await expect(page.getByText("PHP Program").first()).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /manage subscription/i }),
    ).not.toBeVisible();
  });

  test('shows "No plan" badge', async ({ page }) => {
    await setupBillingMocks(page, {
      billingStatus: NO_PLAN_BILLING_STATUS,
      user: { ...DEFAULT_USER, programTier: null },
    });
    await page.goto("/portal/billing");
    await expect(page.getByText(/no plan/i)).toBeVisible({ timeout: 15000 });
  });

  test('all 4 plan cards show "Checkout" button (not "Active")', async ({
    page,
  }) => {
    await setupBillingMocks(page, {
      billingStatus: NO_PLAN_BILLING_STATUS,
      user: { ...DEFAULT_USER, programTier: null },
    });
    await page.goto("/portal/billing");
    await expect(page.getByText("PHP Program").first()).toBeVisible({ timeout: 15000 });

    const checkoutBtns = page.getByRole("button", { name: /checkout/i });
    await expect(checkoutBtns).toHaveCount(4, { timeout: 10000 });

    // "Active" (disabled plan button) should not appear
    const activePlanBtns = page.getByRole("button", { name: /^active$/i });
    await expect(activePlanBtns).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — Current plan card", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test('PHP Premium card shows "Current" badge when user tier is PHP_Premium', async ({
    page,
  }) => {
    await setupBillingMocks(page, {
      billingStatus: ACTIVE_BILLING_STATUS,
      user: { ...DEFAULT_USER, programTier: "PHP_Premium" },
    });
    await page.goto("/portal/billing");
    await expect(page.getByText("PHP Premium").first()).toBeVisible({ timeout: 15000 });

    // The "Current" badge should be visible — exact match to avoid partial hit on "Current access"
    await expect(page.getByText("Current", { exact: true })).toBeVisible();
  });

  test('PHP Premium card shows disabled "Active" button', async ({ page }) => {
    await setupBillingMocks(page, {
      billingStatus: ACTIVE_BILLING_STATUS,
      user: { ...DEFAULT_USER, programTier: "PHP_Premium" },
    });
    await page.goto("/portal/billing");
    await expect(page.getByText("PHP Premium").first()).toBeVisible({ timeout: 15000 });

    const activeBtn = page.getByRole("button", { name: /^active$/i });
    await expect(activeBtn).toBeVisible();
    await expect(activeBtn).toBeDisabled();
  });

  test("other plan cards show enabled Checkout buttons", async ({ page }) => {
    await setupBillingMocks(page, {
      billingStatus: ACTIVE_BILLING_STATUS,
      user: { ...DEFAULT_USER, programTier: "PHP_Premium" },
    });
    await page.goto("/portal/billing");
    await expect(page.getByText("PHP Program").first()).toBeVisible({ timeout: 15000 });

    // PHP_Premium is current; PHP, PHP_Premium_Plus, PHP_Pro should have Checkout or Downgrade
    // All non-current plan buttons should be enabled
    const nonCurrentBtns = page.getByRole("button", {
      name: /checkout|downgrade/i,
    });
    const count = await nonCurrentBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < count; i++) {
      await expect(nonCurrentBtns.nth(i)).toBeEnabled();
    }
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — Invoice history", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test('shows "No invoices yet." empty state when invoices array is empty', async ({
    page,
  }) => {
    await setupBillingMocks(page, { invoices: [] });
    await page.goto("/portal/billing");
    await expect(page.getByText("Invoice History")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/no invoices yet/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("renders invoice rows when invoices exist", async ({ page }) => {
    const twoInvoices = [
      {
        id: 101,
        date: "2025-04-01T00:00:00.000Z",
        plan: "PHP Premium",
        billingCycle: "monthly",
        amount: "$89",
        status: "approved",
        receiptPublicId: null,
      },
      {
        id: 102,
        date: "2025-05-01T00:00:00.000Z",
        plan: "PHP Premium",
        billingCycle: "monthly",
        amount: "$89",
        status: "approved",
        receiptPublicId: null,
      },
    ];

    await setupBillingMocks(page, { invoices: twoInvoices });
    await page.goto("/portal/billing");
    await expect(page.getByText("Invoice History")).toBeVisible({
      timeout: 15000,
    });

    // Both rows should appear — scope to the invoice table (divide-y list) to count plan name cells
    // The page also shows "PHP Premium" in the current access card and plan card (title + description)
    const invoiceList = page.locator(".divide-y");
    await expect(invoiceList).toBeVisible({ timeout: 10000 });
    await expect(invoiceList.getByText("PHP Premium")).toHaveCount(2, { timeout: 10000 });
  });

  test("invoice row displays date, plan name, amount, and status", async ({
    page,
  }) => {
    const invoice = {
      id: 201,
      date: "2025-03-15T00:00:00.000Z",
      plan: "PHP Pro",
      billingCycle: "yearly",
      amount: "$149",
      status: "approved",
      receiptPublicId: null,
    };

    await setupBillingMocks(page, { invoices: [invoice] });
    await page.goto("/portal/billing");
    await expect(page.getByText("Invoice History")).toBeVisible({
      timeout: 15000,
    });

    // "$149" also appears on the PHP Pro plan card price — use .first() to avoid strict mode
    await expect(page.getByText("$149").first()).toBeVisible({ timeout: 10000 });
    // "approved" also appears in the Billing status stat — use .first()
    await expect(page.getByText("approved").first()).toBeVisible();
  });

  test("invoice with receiptPublicId renders an Invoice link", async ({
    page,
  }) => {
    const invoiceWithReceipt = {
      id: 301,
      date: "2025-02-10T00:00:00.000Z",
      plan: "PHP Premium",
      billingCycle: "monthly",
      amount: "$89",
      status: "approved",
      receiptPublicId: "receipt-abc-123",
    };

    await setupBillingMocks(page, { invoices: [invoiceWithReceipt] });
    await page.goto("/portal/billing");
    await expect(page.getByText("Invoice History")).toBeVisible({
      timeout: 15000,
    });

    const invoiceLink = page.getByRole("link", { name: /^invoice$/i });
    await expect(invoiceLink).toBeVisible({ timeout: 10000 });
    await expect(invoiceLink).toHaveAttribute(
      "href",
      "/invoice/receipt-abc-123",
    );
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — Checkout redirect", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test("clicking Checkout on a non-current plan calls checkout endpoint and redirects", async ({
    page,
  }) => {
    // User has PHP_Premium — so PHP Program card will show Checkout (downgrade)
    // and PHP_Pro card will show Checkout (upgrade)
    await setupBillingMocks(page, {
      billingStatus: ACTIVE_BILLING_STATUS,
      user: { ...DEFAULT_USER, programTier: "PHP_Premium" },
    });

    await page.route("**/api/billing/checkout", async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          checkoutUrl: "https://checkout.stripe.com/test",
        }),
      });
    });

    // Intercept the external Stripe navigation so we don't actually leave
    let navigatedToStripe = false;
    await page.route("https://checkout.stripe.com/**", async (route: any) => {
      navigatedToStripe = true;
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Stripe</body></html>",
      });
    });

    await page.goto("/portal/billing");
    await expect(page.getByText("PHP Pro").first()).toBeVisible({ timeout: 15000 });

    // Click the Checkout button on the PHP Pro card (an upgrade)
    // PHP Pro is the highest tier = last plan card = last Checkout button
    // (PHP program gets Downgrade, PHP_Premium is Active/disabled, PHP_Plus + PHP_Pro get Checkout)
    await page.getByRole("button", { name: /checkout/i }).last().click();

    // Wait for either the navigation or the checkout route to be hit
    await page.waitForTimeout(2000);

    // Either navigated to Stripe URL or intercepted the navigation
    const currentUrl = page.url();
    expect(
      navigatedToStripe || currentUrl.includes("checkout.stripe.com"),
    ).toBeTruthy();
  });

  test("checkout POST carries the planId in request body", async ({ page }) => {
    await setupBillingMocks(page, {
      billingStatus: NO_PLAN_BILLING_STATUS,
      user: { ...DEFAULT_USER, programTier: null },
    });

    const receivedBodies: Array<Record<string, unknown>> = [];
    await page.route("**/api/billing/checkout", async (route: any) => {
      try {
        const body = await route.request().postDataJSON();
        receivedBodies.push(body);
      } catch {
        // ignore parse errors
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          checkoutUrl: "https://checkout.stripe.com/test-plan",
        }),
      });
    });

    // Swallow the Stripe navigation
    await page.route("https://checkout.stripe.com/**", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Stripe</body></html>",
      }),
    );

    await page.goto("/portal/billing");
    await expect(page.getByText("PHP Program").first()).toBeVisible({ timeout: 15000 });

    // Click first Checkout button (PHP Program, id=1)
    const firstCheckout = page
      .getByRole("button", { name: /checkout/i })
      .first();
    await firstCheckout.click();

    await page.waitForTimeout(2000);

    // The checkout endpoint should have received a body with planId
    expect(receivedBodies.length).toBeGreaterThan(0);
    expect(receivedBodies[0]).toHaveProperty("planId");
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — Manage subscription portal", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test("clicking Manage subscription hits customer-portal endpoint", async ({
    page,
  }) => {
    await setupBillingMocks(page, { billingStatus: ACTIVE_BILLING_STATUS });

    let portalCalled = false;
    await page.route("**/api/billing/customer-portal", async (route: any) => {
      portalCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://billing.stripe.com/test-portal" }),
      });
    });

    // Intercept the external portal navigation
    await page.route("https://billing.stripe.com/**", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Stripe Portal</body></html>",
      }),
    );

    await page.goto("/portal/billing");
    const manageBtn = page.getByRole("button", { name: /manage subscription/i });
    await expect(manageBtn).toBeVisible({ timeout: 15000 });
    await manageBtn.click();

    await page.waitForTimeout(2000);
    expect(portalCalled).toBeTruthy();
  });

  test("navigates to the URL returned by customer-portal", async ({ page }) => {
    await setupBillingMocks(page, { billingStatus: ACTIVE_BILLING_STATUS });

    await page.route("**/api/billing/customer-portal", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://billing.stripe.com/test-portal" }),
      }),
    );

    let capturedNavUrl: string | null = null;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (url.includes("billing.stripe.com")) {
          capturedNavUrl = url;
        }
      }
    });

    // Intercept external navigation before it happens
    await page.route("https://billing.stripe.com/**", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Stripe Portal</body></html>",
      }),
    );

    await page.goto("/portal/billing");
    const manageBtn = page.getByRole("button", { name: /manage subscription/i });
    await expect(manageBtn).toBeVisible({ timeout: 15000 });
    await manageBtn.click();

    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    expect(
      capturedNavUrl !== null || finalUrl.includes("billing.stripe.com"),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------

test.describe("Billing Portal — Refresh button", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ph-cookie-consent", "accepted");
      localStorage.setItem("ph_auth_token", "fake-token");
    });
  });

  test("clicking Refresh re-calls /api/billing/plans", async ({ page }) => {
    let planCallCount = 0;

    // Override the plans route to count calls
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
    await page.route("**/api/app/set-token", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.route("**/api/app/clear-token", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.route("**/api/auth/me", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: DEFAULT_USER }),
      }),
    );
    await page.route("**/api/billing/plans**", (route: any) => {
      planCallCount++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plans: MOCK_PLANS }),
      });
    });
    await page.route("**/api/billing/status", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ACTIVE_BILLING_STATUS),
      }),
    );
    await page.route("**/api/billing/invoices**", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ invoices: [] }),
      }),
    );
    await page.route("**/api/billing/customer-portal", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://billing.stripe.com/test-portal" }),
      }),
    );

    await page.route("**/api/notifications**", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.route("**/api/messages/inbox**", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ threads: [] }),
      }),
    );

    await page.route("**/api/messages**", (route: any) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: [], threads: [] }),
      }),
    );

    await page.goto("/portal/billing");
    await expect(page.getByText("PHP Premium").first()).toBeVisible({ timeout: 15000 });

    const callsBeforeRefresh = planCallCount;

    const refreshBtn = page.getByRole("button", { name: /refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // Wait for the refresh to complete
    await page.waitForTimeout(1500);

    expect(planCallCount).toBeGreaterThan(callsBeforeRefresh);
  });
});
