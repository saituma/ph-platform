jest.mock("../../src/services/admin.service", () => ({
  addExerciseToSession: jest.fn(),
  assignEnrollment: jest.fn(),
  createExercise: jest.fn(),
  createProgramTemplate: jest.fn(),
  createSession: jest.fn(),
  getAdminProfile: jest.fn(),
  getDashboardMetrics: jest.fn(),
  getUserOnboarding: jest.fn(),
  listBookingsAdmin: jest.fn(),
  listMessageThreadsAdmin: jest.fn(),
  listThreadMessagesAdmin: jest.fn(),
  sendMessageAdmin: jest.fn(),
  listUsers: jest.fn(),
  setUserBlocked: jest.fn(),
  softDeleteUser: jest.fn(),
  updateAdminPreferences: jest.fn(),
  updateAdminProfile: jest.fn(),
  updateAthleteProgramTier: jest.fn(),
  getOnboardingConfig: jest.fn(),
  updateOnboardingConfig: jest.fn(),
}));

import {
  blockUser,
  updateAdminProfileDetails,
  updateOnboardingConfigDetails,
  createProgram,
} from "../../src/controllers/admin.controller";
import { setUserBlocked, updateAdminProfile, updateOnboardingConfig, createProgramTemplate } from "../../src/services/admin.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("admin controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 when blocking unknown user", async () => {
    (setUserBlocked as jest.Mock).mockResolvedValue(null);
    const req = { params: { userId: "12" }, body: { blocked: true } } as any;
    const res = createRes();

    await blockUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  it("returns 400 when admin profile payload invalid", async () => {
    const req = { user: { id: 1 }, body: { name: "", email: "bad" } } as any;
    const res = createRes();

    await updateAdminProfileDetails(req, res);

    expect(updateAdminProfile).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when onboarding config payload invalid", async () => {
    const req = { user: { id: 1 }, body: { version: 0, fields: [] } } as any;
    const res = createRes();

    await updateOnboardingConfigDetails(req, res);

    expect(updateOnboardingConfig).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates program template", async () => {
    (createProgramTemplate as jest.Mock).mockResolvedValue({ id: 1 });
    const req = { user: { id: 4 }, body: { name: "Program", type: "PHP" } } as any;
    const res = createRes();

    await createProgram(req, res);

    expect(createProgramTemplate).toHaveBeenCalledWith({
      name: "Program",
      type: "PHP",
      description: undefined,
      minAge: null,
      maxAge: null,
      createdBy: 4,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ program: { id: 1 } });
  });
});
