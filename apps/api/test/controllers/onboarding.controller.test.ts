jest.mock("../../src/services/onboarding.service", () => ({
  submitOnboarding: jest.fn(async () => ({ athleteId: 1, status: "active" })),
  getOnboardingByUser: jest.fn(),
  getPublicOnboardingConfig: jest.fn(),
  getPhpPlusProgramTabs: jest.fn(),
  updateAthleteProfilePicture: jest.fn(),
  listGuardianAthletesWithUsers: jest.fn(),
  setActiveGuardianAthlete: jest.fn(),
}));

import { submitOnboarding } from "../../src/controllers/onboarding.controller";
import { submitOnboarding as submitOnboardingService } from "../../src/services/onboarding.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("onboarding controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts null growthNotes", async () => {
    const req = {
      user: { id: 1 },
      body: {
        athleteName: "Athlete",
        age: 12,
        team: "Team",
        trainingPerWeek: 3,
        injuries: "None",
        growthNotes: null,
        performanceGoals: "Goals",
        equipmentAccess: "Yes",
        parentEmail: "parent@example.com",
        desiredProgramType: "PHP",
        termsVersion: "v1",
        privacyVersion: "v1",
        appVersion: "1.0.0",
      },
    } as any;
    const res = createRes();

    await submitOnboarding(req, res);

    expect(submitOnboardingService).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        growthNotes: null,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
