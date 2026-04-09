jest.mock("../../src/services/program-section.service", () => ({
  listProgramSectionContent: jest.fn(),
  getProgramSectionContentById: jest.fn(),
  createProgramSectionContent: jest.fn(),
  updateProgramSectionContent: jest.fn(),
  deleteProgramSectionContent: jest.fn(),
}));

jest.mock("../../src/services/user.service", () => ({
  getAthleteForUser: jest.fn(),
}));

jest.mock("../../src/services/program-section-completion.service", () => ({
  getCompletedProgramSectionContentIdsForAthlete: jest.fn(),
  isProgramSectionContentCompletedForAthlete: jest.fn(),
  createProgramSectionCompletion: jest.fn(),
}));

import {
  getProgramSectionContentHandler,
  listProgramSectionContentHandler,
} from "../../src/controllers/program-section.controller";
import {
  getProgramSectionContentById,
  listProgramSectionContent,
} from "../../src/services/program-section.service";
import { getCompletedProgramSectionContentIdsForAthlete } from "../../src/services/program-section-completion.service";
import { getAthleteForUser } from "../../src/services/user.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("program-section controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks list when programTier exceeds athlete tier", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({
      id: 10,
      currentProgramTier: "PHP",
      age: 14,
    });
    const req: any = {
      user: { id: 7, role: "athlete" },
      query: { sectionType: "warmup", programTier: "PHP_Pro", age: "14" },
    };
    const res = createRes();

    await listProgramSectionContentHandler(req, res);

    expect(listProgramSectionContent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Plan locked" });
  });

  it("defaults programTier for non-admin when omitted", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({
      id: 10,
      currentProgramTier: "PHP_Premium",
      age: 15,
    });
    (getCompletedProgramSectionContentIdsForAthlete as jest.Mock).mockResolvedValue(new Set());
    (listProgramSectionContent as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const req: any = {
      user: { id: 7, role: "athlete" },
      query: { sectionType: "warmup", age: "15" },
    };
    const res = createRes();

    await listProgramSectionContentHandler(req, res);

    expect(listProgramSectionContent).toHaveBeenCalledWith({
      sectionType: "warmup",
      programTier: "PHP_Premium",
      age: 15,
      bypassAgeFilter: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("blocks get when content tier exceeds athlete tier", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({
      id: 10,
      currentProgramTier: "PHP",
      age: 18,
    });
    (getProgramSectionContentById as jest.Mock).mockResolvedValue({
      id: 99,
      programTier: "PHP_Premium",
      ageList: null,
    });
    const req: any = {
      user: { id: 7, role: "athlete" },
      params: { contentId: "99" },
    };
    const res = createRes();

    await getProgramSectionContentHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Plan locked" });
  });
});
