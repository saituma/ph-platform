import type { Request, Response } from "express";

jest.mock("../../src/services/billing.service", () => ({
  confirmPaymentSheetIntent: jest.fn(async () => ({ request: null, intent: { status: "succeeded" } })),
}));

describe("billing controller", () => {
  test("confirmPaymentSheet returns 401 when no user", async () => {
    const { confirmPaymentSheet } = await import("../../src/controllers/billing.controller");
    const req = { body: { paymentIntentId: "pi_1" } } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    await confirmPaymentSheet(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("confirmPaymentSheet returns 404 when request not found", async () => {
    const { confirmPaymentSheet } = await import("../../src/controllers/billing.controller");
    const req = { body: { paymentIntentId: "pi_1" }, user: { id: 1 } } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    await confirmPaymentSheet(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
