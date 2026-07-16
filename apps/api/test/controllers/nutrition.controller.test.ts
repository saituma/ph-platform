jest.mock("../../src/config/env", () => {
  const actual = jest.requireActual("../../src/config/env");
  return { env: { ...actual.env, mediaPublicBaseUrl: "https://media.test" } };
});

import { upsertLog } from "../../src/controllers/nutrition.controller";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function createReq(photos: unknown) {
  return {
    user: { id: 7, role: "athlete" },
    body: { dateKey: "2026-07-16", mealType: "daily", photos },
  } as any;
}

describe("nutrition upsertLog meal photos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects photo URLs on a foreign host", async () => {
    const res = createRes();
    await upsertLog(createReq({ breakfast: ["https://evil.test/food-diary/x.jpg"] }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Photo URLs must point to uploaded food-diary media" });
  });

  it("rejects photo URLs outside the food-diary folder", async () => {
    const res = createRes();
    await upsertLog(createReq({ lunch: ["https://media.test/chat-media/x.jpg"] }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects more than 5 photos per meal slot", async () => {
    const res = createRes();
    const urls = Array.from({ length: 6 }, (_, i) => `https://media.test/food-diary/2026/07/${i}.jpg`);
    await upsertLog(createReq({ dinner: urls }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Invalid input" }));
  });

  it("rejects unknown meal slot keys", async () => {
    const res = createRes();
    await upsertLog(createReq({ dessert: ["https://media.test/food-diary/x.jpg"] }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects non-URL photo entries", async () => {
    const res = createRes();
    await upsertLog(createReq({ breakfast: ["not-a-url"] }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
