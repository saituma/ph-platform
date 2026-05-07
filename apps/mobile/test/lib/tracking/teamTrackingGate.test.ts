import {
  parseTeamIdFromApi,
  extractAuthTeamFieldsFromMeUser,
  shouldUseTeamTrackingFeatures,
  canAccessTrackingTab,
} from "@/lib/tracking/teamTrackingGate";

describe("parseTeamIdFromApi", () => {
  it("parses valid numbers", () => {
    expect(parseTeamIdFromApi(5)).toBe(5);
    expect(parseTeamIdFromApi("10")).toBe(10);
  });

  it("returns null for invalid values", () => {
    expect(parseTeamIdFromApi(0)).toBeNull();
    expect(parseTeamIdFromApi(-1)).toBeNull();
    expect(parseTeamIdFromApi("abc")).toBeNull();
    expect(parseTeamIdFromApi(null)).toBeNull();
    expect(parseTeamIdFromApi(undefined)).toBeNull();
  });

  it("truncates floats", () => {
    expect(parseTeamIdFromApi(5.9)).toBe(5);
  });
});

describe("extractAuthTeamFieldsFromMeUser", () => {
  it("extracts string team name", () => {
    expect(extractAuthTeamFieldsFromMeUser({ team: "Eagles", teamId: 5 })).toEqual({
      team: "Eagles",
      teamId: 5,
    });
  });

  it("extracts team name from object", () => {
    expect(extractAuthTeamFieldsFromMeUser({ team: { name: "Hawks" } })).toEqual({
      team: "Hawks",
      teamId: null,
    });
  });

  it("returns null for empty team", () => {
    expect(extractAuthTeamFieldsFromMeUser({ team: "", teamId: undefined })).toEqual({
      team: null,
      teamId: null,
    });
  });
});

describe("shouldUseTeamTrackingFeatures", () => {
  it("returns true for team roles", () => {
    expect(shouldUseTeamTrackingFeatures({ appRole: "team", authTeamMembership: null })).toBe(true);
    expect(shouldUseTeamTrackingFeatures({ appRole: "team_manager", authTeamMembership: null })).toBe(true);
  });

  it("returns true when user has org team membership", () => {
    expect(shouldUseTeamTrackingFeatures({
      appRole: "adult_athlete",
      authTeamMembership: { team: "Eagles", teamId: 5 },
    })).toBe(true);
  });

  it("returns false for non-team athletes without membership", () => {
    expect(shouldUseTeamTrackingFeatures({
      appRole: "adult_athlete",
      authTeamMembership: null,
    })).toBe(false);
  });
});

describe("canAccessTrackingTab", () => {
  it("returns true for adult athletes", () => {
    expect(canAccessTrackingTab({ appRole: "adult_athlete", authTeamMembership: null })).toBe(true);
  });

  it("returns true for team managers", () => {
    expect(canAccessTrackingTab({ appRole: "team_manager", authTeamMembership: null })).toBe(true);
  });

  it("returns true when runTracking capability exists", () => {
    expect(canAccessTrackingTab({
      appRole: "youth_athlete_team_guardian" as any,
      authTeamMembership: null,
      capabilities: { runTracking: true } as any,
    })).toBe(false);
  });
});
