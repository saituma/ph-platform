import { normalizeTeamName } from "../../src/services/team-lookup";

describe("normalizeTeamName", () => {
  it("keeps a real team name", () => {
    expect(normalizeTeamName("Lions U15")).toBe("Lions U15");
    expect(normalizeTeamName("  Lions U15  ")).toBe("Lions U15");
  });

  it("treats the 'no team' sentinels as empty", () => {
    for (const value of ["individual", "None", "N/A", "solo", "UNKNOWN"]) {
      expect(normalizeTeamName(value)).toBe("");
    }
  });

  it("treats blank input as no team", () => {
    expect(normalizeTeamName("")).toBe("");
    expect(normalizeTeamName("   ")).toBe("");
    expect(normalizeTeamName(null)).toBe("");
    expect(normalizeTeamName(undefined)).toBe("");
  });
});
