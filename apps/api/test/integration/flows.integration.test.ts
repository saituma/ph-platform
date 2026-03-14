import request from "supertest";
import { createApp } from "../../src/app";

jest.mock("../../src/middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 1, role: "coach", email: "test@example.com", name: "Test", sub: "sub" };
    next();
  },
}));

jest.mock("../../src/middlewares/roles", () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

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

jest.mock("../../src/services/billing.service", () => ({
  createCheckoutSession: jest.fn(async () => ({ session: { url: "https://checkout", id: "sess_1" }, request: {} })),
  confirmCheckoutSession: jest.fn(async () => ({ session: { payment_status: "paid" }, request: {} })),
}));

jest.mock("../../src/services/chat.service", () => ({
  createGroup: jest.fn(async () => ({ id: 10, name: "Test Group" })),
  addGroupMembers: jest.fn(async () => [1, 2]),
  listGroupMembers: jest.fn(async () => []),
  listGroupMessages: jest.fn(async () => []),
  listGroupsForUser: jest.fn(async () => []),
  createGroupMessage: jest.fn(async () => ({ id: 1 })),
  isGroupMember: jest.fn(async () => true),
  deleteGroupMessage: jest.fn(async () => ({ deleted: true })),
}));

jest.mock("../../src/services/user.service", () => ({
  getGuardianAndAthlete: jest.fn(async () => ({ guardian: { id: 1, userId: 1 }, athlete: { id: 1 } })),
}));

describe("integration flows", () => {
  const app = createApp();

  test("login flow", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "test@example.com", password: "Password123" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test("payment checkout", async () => {
    const res = await request(app).post("/api/billing/checkout").send({ planId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toBe("https://checkout");
  });

  test("payment confirmation", async () => {
    const res = await request(app).post("/api/billing/confirm").send({ sessionId: "sess_1" });
    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
  });

  test("chat creation", async () => {
    const res = await request(app).post("/api/chat/groups").send({ name: "Test", memberIds: [2] });
    expect(res.status).toBe(201);
  });
});
