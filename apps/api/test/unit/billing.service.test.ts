const retrieve = jest.fn(async () => ({ status: "succeeded" }));
const StripeMock = jest.fn().mockImplementation(() => ({
  paymentIntents: { retrieve },
}));

jest.mock("stripe", () => ({
  __esModule: true,
  default: StripeMock,
}));

const returning = jest.fn(async () => [{ id: 1, status: "pending_approval" }]);
const where = jest.fn(() => ({ returning }));
const set = jest.fn(() => ({ where }));
const update = jest.fn(() => ({ set }));

jest.mock("../../src/db", () => ({
  db: { update },
}));

describe("billing service", () => {
  beforeEach(() => {
    retrieve.mockClear();
    StripeMock.mockClear();
    update.mockClear();
    set.mockClear();
    where.mockClear();
    returning.mockClear();
  });

  test("confirmPaymentSheetIntent binds to user", async () => {
    const { confirmPaymentSheetIntent } = await import("../../src/services/billing.service");
    const result = await confirmPaymentSheetIntent({ paymentIntentId: "pi_1", userId: 99 });
    expect(result.request?.id).toBe(1);
    expect(retrieve).toHaveBeenCalledWith("pi_1");
  });
});
