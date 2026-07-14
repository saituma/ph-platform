import {
  parseTeamIdFromApi,
  extractAuthTeamFieldsFromMeUser,
  shouldUseTeamTrackingFeatures,
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

  it("returns false for a team NAME that resolved to no team row", () => {
    // Admin resolves teamId by team name and silently stores null on a miss, so an athlete can
    // carry a name like "Lions U15" with teamId null. /teams/social/* scopes by teamId and 403s
    // NOT_TEAM, so treating the bare name as membership shows a team feed that can never load.
    expect(shouldUseTeamTrackingFeatures({
      appRole: "adult_athlete",
      authTeamMembership: { team: "Lions U15", teamId: null },
    })).toBe(false);
  });
});
