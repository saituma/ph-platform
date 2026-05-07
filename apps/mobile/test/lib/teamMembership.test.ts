import { hasAssignedTeam, hasOrgTeamMembership } from "@/lib/teamMembership";

describe("hasAssignedTeam", () => {
  it("returns true for valid team names", () => {
    expect(hasAssignedTeam("Eagles")).toBe(true);
    expect(hasAssignedTeam("Team A")).toBe(true);
  });

  it("returns false for 'unknown'", () => {
    expect(hasAssignedTeam("unknown")).toBe(false);
    expect(hasAssignedTeam("UNKNOWN")).toBe(false);
    expect(hasAssignedTeam("Unknown")).toBe(false);
  });

  it("returns false for empty/null/undefined", () => {
    expect(hasAssignedTeam("")).toBe(false);
    expect(hasAssignedTeam(null)).toBe(false);
    expect(hasAssignedTeam(undefined)).toBe(false);
    expect(hasAssignedTeam("  ")).toBe(false);
  });
});

describe("hasOrgTeamMembership", () => {
  it("returns true when team name is assigned", () => {
    expect(hasOrgTeamMembership({ team: "Eagles" })).toBe(true);
  });

  it("returns true when teamId is valid even if team is empty", () => {
    expect(hasOrgTeamMembership({ team: null, teamId: 5 })).toBe(true);
    expect(hasOrgTeamMembership({ team: "", teamId: 1 })).toBe(true);
  });

  it("returns false when no team and no teamId", () => {
    expect(hasOrgTeamMembership({ team: null, teamId: null })).toBe(false);
    expect(hasOrgTeamMembership(null)).toBe(false);
    expect(hasOrgTeamMembership(undefined)).toBe(false);
  });

  it("returns false for invalid teamId", () => {
    expect(hasOrgTeamMembership({ team: null, teamId: 0 })).toBe(false);
    expect(hasOrgTeamMembership({ team: null, teamId: -1 })).toBe(false);
  });
});
