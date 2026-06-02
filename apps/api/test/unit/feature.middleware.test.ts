import { requireFeature } from "../../src/middlewares/feature";
import {
  getCurrentPlanFeaturesForManagedTeam,
  getCurrentPlanFeaturesForUser,
} from "../../src/services/billing/feature-access.service";

jest.mock("../../src/services/billing/feature-access.service", () => ({
  getCurrentPlanFeaturesForManagedTeam: jest.fn(),
  getCurrentPlanFeaturesForUser: jest.fn(),
}));

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as any;
}

describe("requireFeature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lets platform admins through without feature lookup", async () => {
    const req = { user: { id: 1, role: "admin" } } as any;
    const res = mockResponse();
    const next = jest.fn();

    await requireFeature("run_tracking")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(getCurrentPlanFeaturesForUser).not.toHaveBeenCalled();
    expect(getCurrentPlanFeaturesForManagedTeam).not.toHaveBeenCalled();
  });

  it("checks team managers against their managed team features", async () => {
    (getCurrentPlanFeaturesForManagedTeam as jest.Mock).mockResolvedValue(new Set(["run_tracking"]));
    const req = { user: { id: 10, role: "team_coach" } } as any;
    const res = mockResponse();
    const next = jest.fn();

    await requireFeature("run_tracking")(req, res, next);

    expect(getCurrentPlanFeaturesForManagedTeam).toHaveBeenCalledWith(10);
    expect(getCurrentPlanFeaturesForUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("denies team managers when the managed team tier does not include the feature", async () => {
    (getCurrentPlanFeaturesForManagedTeam as jest.Mock).mockResolvedValue(new Set(["schedule"]));
    const req = { user: { id: 10, role: "team_coach" } } as any;
    const res = mockResponse();
    const next = jest.fn();

    await requireFeature("social_feed")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Upgrade your plan to access this feature.",
      missingFeature: "social_feed",
      code: "FEATURE_NOT_IN_PLAN",
    });
  });

  it("keeps non-manager users on their own plan features", async () => {
    (getCurrentPlanFeaturesForUser as jest.Mock).mockResolvedValue(new Set(["social_feed"]));
    const req = { user: { id: 20, role: "adult_athlete" } } as any;
    const res = mockResponse();
    const next = jest.fn();

    await requireFeature("social_feed")(req, res, next);

    expect(getCurrentPlanFeaturesForUser).toHaveBeenCalledWith(20);
    expect(getCurrentPlanFeaturesForManagedTeam).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
