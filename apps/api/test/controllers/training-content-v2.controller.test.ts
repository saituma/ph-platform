jest.mock("../../src/services/training-content-v2.service", () => ({
  createTrainingAudience: jest.fn(),
  createTrainingModule: jest.fn(),
  createTrainingModuleSession: jest.fn(),
  createTrainingOtherContent: jest.fn(),
  createTrainingSessionItem: jest.fn(),
  cleanupTrainingPlaceholderModules: jest.fn(),
  copyTrainingModulesFromAudience: jest.fn(),
  deleteTrainingModule: jest.fn(),
  deleteTrainingModuleSession: jest.fn(),
  deleteTrainingOtherContent: jest.fn(),
  deleteTrainingSessionItem: jest.fn(),
  finishTrainingModuleSessionWithLog: jest.fn(),
  getTrainingContentMobileWorkspace: jest.fn(),
  listTrainingAudiences: jest.fn(),
  listTrainingContentAdminWorkspace: jest.fn(),
  updateTrainingSessionTierLocks: jest.fn(),
  updateTrainingModuleTierLocks: jest.fn(),
  unlockTrainingModuleTierLocks: jest.fn(),
  updateTrainingModule: jest.fn(),
  updateTrainingModuleSession: jest.fn(),
  updateTrainingOtherContent: jest.fn(),
  updateTrainingOtherTypeSetting: jest.fn(),
  updateTrainingSessionItem: jest.fn(),
}));

jest.mock("../../src/services/user.service", () => ({
  getAthleteForUser: jest.fn(),
}));

import { finishTrainingSessionHandler } from "../../src/controllers/training-content-v2.controller";
import {
  finishTrainingModuleSessionWithLog,
  getTrainingContentMobileWorkspace,
} from "../../src/services/training-content-v2.service";
import { getAthleteForUser } from "../../src/services/user.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("training-content-v2 controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks finishing locked sessions", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({
      id: 11,
      age: 13,
      currentProgramTier: "PHP",
    });
    (getTrainingContentMobileWorkspace as jest.Mock).mockResolvedValue({
      age: 13,
      tabs: ["Modules"],
      modules: [
        {
          id: 1,
          order: 1,
          title: "M1",
          totalDayLength: 3,
          completed: false,
          locked: false,
          sessions: [{ id: 123, title: "S1", order: 1, dayLength: 1, completed: false, locked: true, items: [] }],
        },
      ],
      others: [],
    });
    const req: any = { user: { id: 7 }, params: { sessionId: "123" } };
    const res = createRes();

    await finishTrainingSessionHandler(req, res);

    expect(finishTrainingModuleSessionWithLog).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Session locked" });
  });

  it("finishes unlocked sessions (no log)", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({
      id: 11,
      age: 13,
      currentProgramTier: "PHP",
      team: "Team A",
    });
    (getTrainingContentMobileWorkspace as jest.Mock).mockResolvedValue({
      age: 13,
      tabs: ["Modules"],
      modules: [
        {
          id: 1,
          order: 1,
          title: "M1",
          totalDayLength: 3,
          completed: false,
          locked: false,
          sessions: [{ id: 123, title: "S1", order: 1, dayLength: 1, completed: false, locked: false, items: [] }],
        },
      ],
      others: [],
    });
    (finishTrainingModuleSessionWithLog as jest.Mock).mockResolvedValue({ athleteId: 11, sessionId: 123 });
    const req: any = { user: { id: 7 }, params: { sessionId: "123" } };
    const res = createRes();

    await finishTrainingSessionHandler(req, res);

    expect(finishTrainingModuleSessionWithLog).toHaveBeenCalledWith({
      athleteId: 11,
      sessionId: 123,
      workoutLog: null,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ item: { athleteId: 11, sessionId: 123 } });
  });

  it("finishes unlocked sessions with workout log", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({
      id: 11,
      age: 22,
      currentProgramTier: "PHP",
      team: "Team A",
    });
    (getTrainingContentMobileWorkspace as jest.Mock).mockResolvedValue({
      age: 22,
      tabs: ["Modules"],
      modules: [
        {
          id: 1,
          order: 1,
          title: "M1",
          totalDayLength: 3,
          completed: false,
          locked: false,
          sessions: [{ id: 123, title: "S1", order: 1, dayLength: 1, completed: false, locked: false, items: [] }],
        },
      ],
      others: [],
    });
    (finishTrainingModuleSessionWithLog as jest.Mock).mockResolvedValue({ athleteId: 11, sessionId: 123 });
    const req: any = {
      user: { id: 7 },
      params: { sessionId: "123" },
      body: { weightsUsed: " 20kg ", repsCompleted: " 8,8,8 ", rpe: 7 },
    };
    const res = createRes();

    await finishTrainingSessionHandler(req, res);

    expect(finishTrainingModuleSessionWithLog).toHaveBeenCalledWith({
      athleteId: 11,
      sessionId: 123,
      workoutLog: { weightsUsed: "20kg", repsCompleted: "8,8,8", rpe: 7 },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rejects invalid rpe", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({
      id: 11,
      age: 22,
      currentProgramTier: "PHP",
      team: "Team A",
    });
    (getTrainingContentMobileWorkspace as jest.Mock).mockResolvedValue({
      age: 22,
      tabs: ["Modules"],
      modules: [
        {
          id: 1,
          order: 1,
          title: "M1",
          totalDayLength: 3,
          completed: false,
          locked: false,
          sessions: [{ id: 123, title: "S1", order: 1, dayLength: 1, completed: false, locked: false, items: [] }],
        },
      ],
      others: [],
    });

    const req: any = {
      user: { id: 7 },
      params: { sessionId: "123" },
      body: { rpe: 11 },
    };
    const res = createRes();

    await finishTrainingSessionHandler(req, res);

    expect(finishTrainingModuleSessionWithLog).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid workout log" });
  });
});
