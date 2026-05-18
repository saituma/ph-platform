import type { Request, Response } from "express";

let mockInsertValues: jest.Mock;
const mockBlockUserPair = jest.fn();

jest.mock("../../src/db", () => ({
  db: {
    insert: jest.fn(() => ({
      values: mockInsertValues,
    })),
  },
}));

jest.mock("../../src/config/env", () => ({
  env: {
    smtpFrom: "",
    smtpUser: "",
    adminWebUrl: "https://admin.example.test",
  },
}));

jest.mock("../../src/services/user-block.service", () => ({
  blockUserPair: (...args: Parameters<typeof mockBlockUserPair>) => mockBlockUserPair(...args),
}));

jest.mock("../../src/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("../../src/lib/mailer/admin.mailer", () => ({
  sendContentReportEmail: jest.fn(),
}));

import { blockUser, reportUser } from "../../src/controllers/users.controller";

function createRes() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}

function createReq(input: { actingUserId: number; targetUserId: string; body?: unknown }) {
  return {
    user: { id: input.actingUserId },
    params: { userId: input.targetUserId },
    body: input.body,
  } as unknown as Request;
}

describe("users controller UGC safety actions", () => {
  beforeEach(() => {
    mockInsertValues = jest.fn(async () => undefined);
    mockBlockUserPair.mockReset();
  });

  it("persists user blocks and records the moderation audit event", async () => {
    mockBlockUserPair.mockResolvedValue(undefined);
    const res = createRes();

    await blockUser(createReq({ actingUserId: 10, targetUserId: "20" }), res);

    expect(mockBlockUserPair).toHaveBeenCalledWith({ blockerId: 10, blockedId: 20 });
    expect(mockInsertValues).toHaveBeenCalledWith({
      performedBy: 10,
      action: "user_blocked",
      targetTable: "users",
      targetId: 20,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("keeps user reporting audit-only and moderation-safe", async () => {
    const res = createRes();

    await reportUser(
      createReq({
        actingUserId: 10,
        targetUserId: "20",
        body: { reason: "abuse", details: "sent unsafe messages" },
      }),
      res,
    );

    expect(mockBlockUserPair).not.toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith({
      performedBy: 10,
      action: "user_reported:abuse | sent unsafe messages",
      targetTable: "users",
      targetId: 20,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
