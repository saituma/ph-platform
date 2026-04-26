import { resolveAppRole } from "@/lib/appRole";

describe("resolveAppRole", () => {
  it("keeps team managers separate from platform coaches", () => {
    expect(resolveAppRole({ userRole: "team_coach" })).toBe("team_manager");
    expect(resolveAppRole({ userRole: "program_coach" })).toBe("coach");
  });

  it("preserves adult and youth team athlete variants", () => {
    expect(
      resolveAppRole({
        userRole: "team_athlete",
        athlete: { athleteType: "adult", teamId: 7 },
      }),
    ).toBe("adult_athlete_team");

    expect(
      resolveAppRole({
        userRole: "team_athlete",
        athlete: { athleteType: "youth", teamId: 7 },
      }),
    ).toBe("youth_athlete_team_guardian");
  });
});
