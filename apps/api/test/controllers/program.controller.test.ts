jest.mock("../../src/services/program.service", () => ({
  getProgramCards: jest.fn(),
  getProgramById: jest.fn(),
  getProgramSessions: jest.fn(),
}));

import { listPrograms, getProgram, getProgramSessionsById } from "../../src/controllers/program.controller";
import { getProgramCards, getProgramById, getProgramSessions } from "../../src/services/program.service";

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
    (getProgramById as jest.Mock).mockResolvedValue(null);
    const req = { params: { programId: "99" } } as any;
    const res = createRes();

    await getProgram(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Program not found" });
  });

  it("returns sessions for program", async () => {
    (getProgramSessions as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const req = { params: { programId: "1" } } as any;
    const res = createRes();

    await getProgramSessionsById(req, res);

    expect(getProgramSessions).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sessions: [{ id: 1 }] });
  });
});
