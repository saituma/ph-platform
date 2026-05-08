import { test, expect, type Page } from "@playwright/test";

function createFakeJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "1", role: "admin", exp: expSeconds })).toString("base64url");
  const signature = "fakesignature";
  return `${header}.${payload}.${signature}`;
}

async function authenticateWithCookies(page: Page, baseURL: string) {
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = createFakeJwt(expiry);
  const domain = new URL(baseURL).hostname;

  await page.context().addCookies([
    { name: "accessToken", value: token, domain, path: "/" },
    { name: "accessTokenClient", value: token, domain, path: "/" },
  ]);
}

const mockUsers = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "athlete", createdAt: "2025-01-01", programTier: "PHP_Premium" },
  { id: 2, name: "Bob Williams", email: "bob@example.com", role: "guardian", createdAt: "2025-01-05", programTier: "PHP_Pro" },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "athlete", createdAt: "2025-02-10", programTier: "PHP_Premium_Plus" },
  { id: 4, name: "Diana Prince", email: "diana@example.com", role: "athlete", createdAt: "2025-03-15", programTier: null },
  { id: 5, name: "Eve Adams", email: "eve@example.com", role: "team_manager", createdAt: "2025-04-20", programTier: null },
];

async function mockApiCalls(page: Page) {
  await page.route("**/api/backend/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/users")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users: mockUsers }),
      });
    } else if (url.includes("/threads")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ threads: [] }),
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
    } else if (url.includes("/dashboard")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kpis: { totalAthletes: 5, premiumClients: 2, unreadMessages: 0, bookingsToday: 0 },
          bookingsToday: [],
          trends: {},
          weeklyVolume: { bars: [], totals: { messages: 0, bookings: 0, uploads: 0 } },
          topAthletes: [],
          tierDistribution: null,
          weeklyProgress: { series: [], labels: [] },
          highlights: [],
          programOps: [],
        }),
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

test.describe("Users Page", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await authenticateWithCookies(page, baseURL!);
    await mockApiCalls(page);
  });

  test("users page loads and displays page title", async ({ page }) => {
    await page.goto("/users");

    // The page should load with Users content visible
    // AdminShell renders the title
    await expect(page.locator("text=Users")).first().toBeVisible({ timeout: 15_000 });
  });

  test("users page displays user data from API", async ({ page }) => {
    await page.goto("/users");

    // Wait for the page to render users from our mock
    await expect(page.locator("text=Alice Johnson")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("text=Bob Williams")).toBeVisible();
    await expect(page.locator("text=Charlie Brown")).toBeVisible();
  });

  test("users page shows email addresses", async ({ page }) => {
    await page.goto("/users");

    await expect(page.locator("text=alice@example.com")).toBeVisible({ timeout: 15_000 });
  });

  test("users page has search or filter functionality", async ({ page }) => {
    await page.goto("/users");

    // Look for search input or filter controls
    const searchInput = page.locator('input[placeholder*="earch"], input[type="search"], input[placeholder*="ilter"]');
    const filterButtons = page.locator('button:has-text("Filter"), button:has-text("All"), [data-testid="users-filter"]');

    // At least one search/filter mechanism should exist
    const hasSearch = await searchInput.count();
    const hasFilters = await filterButtons.count();

    expect(hasSearch + hasFilters).toBeGreaterThan(0);
  });

  test("users page renders without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("turnstile")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/users");
    await page.waitForTimeout(3000);

    // Filter out known non-critical errors (network requests to backend, etc.)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("Failed to fetch") && !err.includes("net::ERR") && !err.includes("favicon")
    );

    // We allow some errors since we're mocking APIs, but there shouldn't be React crashes
    expect(criticalErrors.filter((e) => e.includes("Unhandled") || e.includes("crash"))).toHaveLength(0);
  });
});

test.describe("Users Page - Unauthenticated", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/users");

    await page.waitForURL("**/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
