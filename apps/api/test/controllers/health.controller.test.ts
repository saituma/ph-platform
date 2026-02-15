import { healthCheck } from "../../src/controllers/health.controller";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("health controller", () => {
  it("returns status ok", () => {
    const res = createRes();

    healthCheck({} as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        timestamp: expect.any(String),
      }),
    );
  });
});
