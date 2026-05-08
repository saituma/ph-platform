import { test, expect, type Page } from "@playwright/test";

/**
 * Creates a fake JWT access token with the given expiry (seconds from epoch).
 * The token has a valid 3-part structure so the middleware can decode it.
 */
function createFakeJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "1", role: "admin", exp: expSeconds })).toString("base64url");
  const signature = "fakesignature";
  return `${header}.${payload}.${signature}`;
}

/**
 * Set auth cookies so the middleware allows access to protected pages.
 * The token expires 1 hour from now.
 */
async function authenticateWithCookies(page: Page, baseURL: string) {
  const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const token = createFakeJwt(expiry);
  const domain = new URL(baseURL).hostname;

  await page.context().addCookies([
    { name: "accessToken", value: token, domain, path: "/" },
    { name: "accessTokenClient", value: token, domain, path: "/" },
  ]);
}

/**
 * Mock all API calls that the dashboard and sidebar make on load,
 * so pages render without needing a real backend.
 */
async function mockApiCalls(page: Page) {
  await page.route("**/api/backend/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/dashboard")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kpis: { totalAthletes: 42, premiumClients: 12, unreadMessages: 3, bookingsToday: 5 },
          bookingsToday: [],
          trends: { trainingLoad: 78, messagingResponseRate: 92, bookingsUtilization: 65, trainingSeries: [], messagingSeries: [], bookingSeries: [] },
          weeklyVolume: { bars: [], totals: { messages: 120, bookings: 30, uploads: 15 } },
          topAthletes: [],
          tierDistribution: { program: 20, premium: 10, premiumPlus: 8, pro: 4, total: 42 },
          weeklyProgress: { series: [], labels: [] },
          highlights: [],
          programOps: [],
        }),
      });
    } else if (url.includes("/threads")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ threads: [] }),
      });
    } else if (url.includes("/users")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            { id: 1, name: "John Doe", email: "john@example.com", role: "athlete", createdAt: "2025-01-01" },
            { id: 2, name: "Jane Smith", email: "jane@example.com", role: "guardian", createdAt: "2025-01-02" },
          ],
        }),
      });
    } else if (url.includes("/video-uploads")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    } else if (url.includes("/teams")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ teams: [] }),
      });
    } else if (url.includes("/home-content")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }
  });
}

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await authenticateWithCookies(page, baseURL!);
    await mockApiCalls(page);
  });

  test("dashboard page loads after auth", async ({ page }) => {
    await page.goto("/");

    // The AdminShell renders a greeting
    await expect(page.locator("text=Good")).toBeVisible({ timeout: 15_000 });
  });

  test("sidebar renders all expected navigation groups", async ({ page }) => {
    await page.goto("/");

    // Wait for sidebar to appear (desktop only, lg breakpoint)
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    // Check key navigation links exist
    await expect(sidebar.locator("text=Overview")).toBeVisible();
    await expect(sidebar.locator("text=Users & Tiers")).toBeVisible();
    await expect(sidebar.locator("text=Teams")).toBeVisible();
    await expect(sidebar.locator("text=Billing")).toBeVisible();
    await expect(sidebar.locator("text=Messaging")).toBeVisible();
    await expect(sidebar.locator("text=Schedule")).toBeVisible();
    await expect(sidebar.locator("text=Settings")).toBeVisible();
  });

  test("sidebar shows PH Performance branding", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible({ timeout: 15_000 });
    await expect(sidebar.locator("text=PERFORMANCE")).toBeVisible();
    await expect(sidebar.locator("text=OPERATIONS HUB")).toBeVisible();
  });

  test("navigate to Users page via sidebar", async ({ page }) => {
    await page.goto("/");

    await page.locator("aside").locator("text=Users & Tiers").click();
    await page.waitForURL("**/users", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/users$/);
  });

  test("navigate to Teams page via sidebar", async ({ page }) => {
    await page.goto("/");

    await page.locator("aside").locator("text=Teams").click();
    await page.waitForURL("**/teams", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/teams$/);
  });

  test("navigate to Billing page via sidebar", async ({ page }) => {
    await page.goto("/");

    await page.locator("aside").locator("text=Billing").click();
    await page.waitForURL("**/billing", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/billing$/);
  });

  test("navigate to Messaging page via sidebar", async ({ page }) => {
    await page.goto("/");

    await page.locator("aside").locator("text=Messaging").click();
    await page.waitForURL("**/messaging", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/messaging$/);
  });

  test("navigate to Schedule page via sidebar", async ({ page }) => {
    await page.goto("/");

    await page.locator("aside").locator("text=Schedule").click();
    await page.waitForURL("**/bookings", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/bookings$/);
  });
});
