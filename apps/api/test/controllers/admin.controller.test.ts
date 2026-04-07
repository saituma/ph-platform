jest.mock("../../src/services/admin/user.service", () => ({
  setUserBlocked: jest.fn(),
}));
jest.mock("../../src/services/admin/settings.service", () => ({
  updateAdminProfile: jest.fn(),
}));
jest.mock("../../src/services/admin/onboarding-config.service", () => ({
  updateOnboardingConfig: jest.fn(),
}));
jest.mock("../../src/services/admin/program.service", () => ({
  createProgramTemplate: jest.fn(),
}));

import { blockUser } from "../../src/controllers/admin/user.controller";
import { updateAdminProfileDetails } from "../../src/controllers/admin/settings.controller";
import { updateOnboardingConfigDetails } from "../../src/controllers/admin/onboarding-config.controller";
import { createProgram } from "../../src/controllers/admin/program.controller";

import { setUserBlocked } from "../../src/services/admin/user.service";
import { updateAdminProfile } from "../../src/services/admin/settings.service";
import { updateOnboardingConfig } from "../../src/services/admin/onboarding-config.service";
import { createProgramTemplate } from "../../src/services/admin/program.service";

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
