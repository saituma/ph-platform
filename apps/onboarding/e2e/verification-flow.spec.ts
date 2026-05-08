import { test, expect } from "@playwright/test";

test.describe("Verification Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("pending_email", "test@example.com");
      localStorage.setItem("ph-cookie-consent", "accepted");
    });
  });

  test("renders OTP inputs and verify button", async ({ page }) => {
    await page.goto("/verification");
    const otpInputs = page.locator('input[inputmode="numeric"]');
    await expect(otpInputs).toHaveCount(6);
    await expect(
      page.getByRole("button", { name: /verify/i }),
    ).toBeVisible();
  });

  test("OTP inputs have accessible labels", async ({ page }) => {
    await page.goto("/verification");
    for (let i = 1; i <= 6; i++) {
      await expect(
        page.getByLabel(`Verification digit ${i} of 6`),
      ).toBeVisible();
    }
  });

  test("OTP group has accessible role", async ({ page }) => {
    await page.goto("/verification");
    await expect(
      page.getByRole("group", { name: /verification code/i }),
    ).toBeVisible();
  });

  test("verify button is disabled until all digits entered", async ({
    page,
  }) => {
    await page.goto("/verification");
    const verifyBtn = page.getByRole("button", { name: /verify/i });
    await expect(verifyBtn).toBeDisabled();

    const inputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill(String(i + 1));
    }
    await expect(verifyBtn).toBeEnabled();
  });

  test("paste fills all OTP digits", async ({ page }) => {
    await page.goto("/verification");
    const firstInput = page.locator('input[inputmode="numeric"]').first();
    await firstInput.focus();

    // Use keyboard shortcut to paste via the browser clipboard API
    await page.evaluate(() => {
      const group = document.querySelector('[role="group"]');
      if (!group) return;
      const dt = new DataTransfer();
      dt.setData("text/plain", "654321");
      const paste = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      group.dispatchEvent(paste);
    });

    const inputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await expect(inputs.nth(i)).toHaveValue(String(6 - i));
    }
  });

  test("successful verification redirects to onboarding step-1", async ({
    page,
  }) => {
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

    await page.route("**/api/auth/confirm", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInN1YiI6IjEifQ.test",
        }),
      }),
    );

    await page.goto("/verification");
    const inputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill(String(i + 1));
    }
    await page.getByRole("button", { name: /verify/i }).click();

    await expect(page).toHaveURL(/\/onboarding\/step-1/, {
      timeout: 10000,
    });
  });

  test("failed verification shows error toast", async ({ page }) => {
    await page.route("**/api/auth/confirm", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid code" }),
      }),
    );

    await page.goto("/verification");
    const inputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill("0");
    }
    await page.getByRole("button", { name: /verify/i }).click();

    await expect(page.getByText(/verification failed/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("resend code button works", async ({ page }) => {
    await page.route("**/api/auth/resend", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );

    await page.goto("/verification");
    const resendBtn = page.getByRole("button", { name: /resend code/i });
    await expect(resendBtn).toBeVisible();
    await resendBtn.click();
    await expect(page.getByText(/new code sent/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("displays pending email", async ({ page }) => {
    await page.goto("/verification");
    await expect(page.getByText("test@example.com")).toBeVisible();
  });
});
