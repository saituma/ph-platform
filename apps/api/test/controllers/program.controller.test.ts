jest.mock("../../src/services/program.service", () => ({
  getProgramCards: jest.fn(),
  getProgramByIdForUser: jest.fn(),
  getProgramSessions: jest.fn(),
  getExerciseLibrary: jest.fn(),
}));

import {
  listPrograms,
  getProgram,
  getProgramSessionsById,
  listProgramExercises,
} from "../../src/controllers/program.controller";
import {
  getExerciseLibrary,
  getProgramCards,
  getProgramByIdForUser,
  getProgramSessions,
} from "../../src/services/program.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("program controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists programs", async () => {
    (getProgramCards as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const req = { user: { id: 2 } } as any;
    const res = createRes();

    await listPrograms(req, res);

    expect(getProgramCards).toHaveBeenCalledWith(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ programs: [{ id: 1 }] });
  });

  it("returns 404 when program missing", async () => {
    (getProgramByIdForUser as jest.Mock).mockResolvedValue(null);
    const req = { user: { id: 2 }, params: { programId: "99" } } as any;
    const res = createRes();

    await getProgram(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Program not found" });
  });

  it("returns sessions for program", async () => {
    (getProgramByIdForUser as jest.Mock).mockResolvedValue({ id: 1 });
    (getProgramSessions as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const req = { user: { id: 2 }, params: { programId: "1" } } as any;
    const res = createRes();

    await getProgramSessionsById(req, res);

    expect(getProgramSessions).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sessions: [{ id: 1 }] });
  });

  it("lists exercise library for mobile", async () => {
    (getExerciseLibrary as jest.Mock).mockResolvedValue([{ id: 10, name: "Sprint" }]);
    const req = {} as any;
    const res = createRes();

    await listProgramExercises(req, res);

    expect(getExerciseLibrary).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ exercises: [{ id: 10, name: "Sprint" }] });
  });
});
