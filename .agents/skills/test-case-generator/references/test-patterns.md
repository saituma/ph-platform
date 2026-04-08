# Project Test Patterns

This reference file provides examples of existing tests in the PH-App project to ensure consistency in generated test implementations.

## 1. API Unit Testing (Jest)
Example from `apps/api/test/unit/auth-middleware.test.ts`:

```typescript
import type { NextFunction, Request, Response } from "express";

const verifyAccessToken = jest.fn();
// ... other mocks

describe("requireAuth middleware", () => {
  beforeEach(() => {
    jest.resetModules();
    verifyAccessToken.mockReset();
    // ... reset mocks
  });

  test("returns 401 when no Authorization header is present", async () => {
    const { requireAuth } = await import("../../src/middlewares/auth");

    const req = { headers: {}, method: "GET", path: "/secure" } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

## 2. Mobile Integration Testing (Jest / React Native)
Example from `apps/mobile/test/api-request.test.ts`:

```typescript
import { apiRequest } from "../lib/api";

jest.mock("../lib/api", () => ({
  apiRequest: jest.fn(),
}));

describe("API Request Integration", () => {
  test("successfully fetches data", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: { id: 1 } });
    const response = await apiRequest("/data", "GET");
    expect(response.data.id).toBe(1);
  });
});
```

## 3. E2E Testing (Playwright)
Example from `e2e/login.spec.ts` (if available):

```typescript
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
```

*Note: Use `playwright.config.ts` for E2E configuration.*
