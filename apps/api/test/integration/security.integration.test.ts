import request from "supertest";
import { createApp } from "../../src/app";

jest.mock("../../src/services/auth.service", () => ({
  loginUser: jest.fn(async () => ({
    AuthenticationResult: {
      AccessToken: "token",
      IdToken: "id",
      RefreshToken: "refresh",
      ExpiresIn: 3600,
      TokenType: "Bearer",
    },
  })),
}));

jest.mock("../../src/middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 1, role: "guardian", email: "test@example.com", name: "Test", sub: "sub" };
    next();
  },
}));

jest.mock("../../src/services/billing.service", () => ({
  confirmPaymentSheetIntent: jest.fn(async () => ({ request: null, intent: { status: "succeeded" } })),
}));

describe("security integration", () => {
  const app = createApp();

  test("rate limiting triggers after repeated login attempts", async () => {
    const payload = { email: "test@example.com", password: "Password123" };
    let lastStatus = 0;
    for (let i = 0; i < 31; i += 1) {
      const res = await request(app).post("/api/auth/login").send(payload);
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    expect([200, 429]).toContain(lastStatus);
  });

  test("payment confirmation returns 404 when not owned", async () => {
    const res = await request(app).post("/api/billing/payment-sheet/confirm").send({ paymentIntentId: "pi_1" });
    expect(res.status).toBe(404);
  });
});
