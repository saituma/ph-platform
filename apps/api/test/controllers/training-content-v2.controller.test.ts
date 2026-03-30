jest.mock("../../src/services/training-content-v2.service", () => ({
  listTrainingContentAdminWorkspace: jest.fn(),
  getTrainingContentMobileWorkspace: jest.fn(),
  createTrainingModule: jest.fn(),
  updateTrainingModule: jest.fn(),
  deleteTrainingModule: jest.fn(),
  createTrainingModuleSession: jest.fn(),
  updateTrainingModuleSession: jest.fn(),
  deleteTrainingModuleSession: jest.fn(),
  createTrainingSessionItem: jest.fn(),
  updateTrainingSessionItem: jest.fn(),
  deleteTrainingSessionItem: jest.fn(),
  createTrainingOtherContent: jest.fn(),
  updateTrainingOtherContent: jest.fn(),
  deleteTrainingOtherContent: jest.fn(),
  finishTrainingModuleSession: jest.fn(),
  listTrainingAudiences: jest.fn(),
}));

jest.mock("../../src/services/user.service", () => ({
  getAthleteForUser: jest.fn(),
}));

import {
  finishTrainingSessionHandler,
  getTrainingContentAdminWorkspaceHandler,
  getTrainingContentMobileWorkspaceHandler,
  listTrainingAudiencesHandler,
} from "../../src/controllers/training-content-v2.controller";
import {
  finishTrainingModuleSession,
  getTrainingContentMobileWorkspace,
  listTrainingAudiences,
  listTrainingContentAdminWorkspace,
} from "../../src/services/training-content-v2.service";
import { getAthleteForUser } from "../../src/services/user.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("training content v2 controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns admin workspace for an age", async () => {
    (listTrainingContentAdminWorkspace as jest.Mock).mockResolvedValue({ audienceLabel: "8", modules: [], others: [] });
    const req = { query: { audienceLabel: "8" } } as any;
    const res = createRes();

    await getTrainingContentAdminWorkspaceHandler(req, res);

    expect(listTrainingContentAdminWorkspace).toHaveBeenCalledWith("8");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ audienceLabel: "8", modules: [], others: [] });
  });

  it("lists available audiences", async () => {
    (listTrainingAudiences as jest.Mock).mockResolvedValue([{ label: "5-6", moduleCount: 1, otherCount: 2 }]);
    const req = {} as any;
    const res = createRes();

    await listTrainingAudiencesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [{ label: "5-6", moduleCount: 1, otherCount: 2 }] });
  });

  it("returns mobile workspace with athlete age fallback", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({ id: 21, age: 11 });
    (getTrainingContentMobileWorkspace as jest.Mock).mockResolvedValue({ age: 11, tabs: ["Modules"], modules: [], others: [] });
    const req = { query: {}, user: { id: 5 } } as any;
    const res = createRes();

    await getTrainingContentMobileWorkspaceHandler(req, res);

    expect(getTrainingContentMobileWorkspace).toHaveBeenCalledWith({ age: 11, athleteId: 21 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ age: 11, tabs: ["Modules"], modules: [], others: [] });
  });

  it("marks a session finished for the active athlete", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({ id: 13 });
    (finishTrainingModuleSession as jest.Mock).mockResolvedValue({ id: 1, athleteId: 13, sessionId: 7 });
    const req = { params: { sessionId: "7" }, user: { id: 5 } } as any;
    const res = createRes();

    await finishTrainingSessionHandler(req, res);

    expect(finishTrainingModuleSession).toHaveBeenCalledWith({ athleteId: 13, sessionId: 7 });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ item: { id: 1, athleteId: 13, sessionId: 7 } });
  });
});
