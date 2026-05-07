import {
  normalizeAudienceLabelInput,
  isYouthAgeAudienceLabel,
  isAdultStorageAudienceLabel,
  toStorageAudienceLabel,
  fromStorageAudienceLabel,
  isTeamStorageAudienceLabel,
  toTeamStorageAudienceLabel,
  fromTeamStorageAudienceLabel,
  ADULT_AUDIENCE_PREFIX,
  TEAM_AUDIENCE_PREFIX,
} from "@/lib/training-content-utils";

describe("normalizeAudienceLabelInput", () => {
  it("returns 'All' for empty/whitespace", () => {
    expect(normalizeAudienceLabelInput("")).toBe("All");
    expect(normalizeAudienceLabelInput("  ")).toBe("All");
  });

  it("normalizes 'all' case-insensitively", () => {
    expect(normalizeAudienceLabelInput("ALL")).toBe("All");
    expect(normalizeAudienceLabelInput("all")).toBe("All");
  });

  it("normalizes age ranges with proper ordering", () => {
    expect(normalizeAudienceLabelInput("8-12")).toBe("8-12");
    expect(normalizeAudienceLabelInput("12 - 8")).toBe("8-12");
  });

  it("normalizes single ages", () => {
    expect(normalizeAudienceLabelInput("14")).toBe("14");
  });

  it("preserves other strings trimmed", () => {
    expect(normalizeAudienceLabelInput(" Custom Label ")).toBe("Custom Label");
  });
});

describe("isYouthAgeAudienceLabel", () => {
  it("returns true for 'All'", () => {
    expect(isYouthAgeAudienceLabel("All")).toBe(true);
  });

  it("returns true for youth ages", () => {
    expect(isYouthAgeAudienceLabel("14")).toBe(true);
    expect(isYouthAgeAudienceLabel("8-12")).toBe(true);
  });

  it("returns false for adult ages", () => {
    expect(isYouthAgeAudienceLabel("25")).toBe(false);
    expect(isYouthAgeAudienceLabel("18-25")).toBe(false);
  });
});

describe("adult audience labels", () => {
  it("detects adult storage labels", () => {
    expect(isAdultStorageAudienceLabel("adult::All")).toBe(true);
    expect(isAdultStorageAudienceLabel("14")).toBe(false);
  });

  it("converts to storage label", () => {
    expect(toStorageAudienceLabel({ audienceLabel: "All", adultMode: true })).toBe("adult::All");
    expect(toStorageAudienceLabel({ audienceLabel: "All", adultMode: false })).toBe("All");
  });

  it("converts from storage label", () => {
    expect(fromStorageAudienceLabel("adult::All")).toBe("All");
    expect(fromStorageAudienceLabel("14")).toBe("14");
  });
});

describe("team audience labels", () => {
  it("detects team storage labels", () => {
    expect(isTeamStorageAudienceLabel("team::Eagles")).toBe(true);
    expect(isTeamStorageAudienceLabel("Eagles")).toBe(false);
  });

  it("converts to team storage label", () => {
    expect(toTeamStorageAudienceLabel("Eagles")).toBe("team::Eagles");
    expect(toTeamStorageAudienceLabel("")).toBe("team::All");
  });

  it("converts from team storage label", () => {
    expect(fromTeamStorageAudienceLabel("team::Eagles")).toBe("Eagles");
  });
});
