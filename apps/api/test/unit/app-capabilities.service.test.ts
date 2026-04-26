import { buildAppCapabilities } from "../../src/services/app-capabilities.service";
import type { ProgramTierValue } from "../../src/services/messaging-policy.service";

describe("buildAppCapabilities", () => {
  const messagingAccessTiers: ProgramTierValue[] = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];

  it("keeps payments out of mobile-facing capabilities", () => {
    const adult = buildAppCapabilities({
      role: "adult_athlete",
      programTier: "PHP_Premium",
      messagingAccessTiers,
      athleteType: "adult",
    });

    expect(adult.mobilePayments).toBe(false);
    expect(adult.billingPortal).toBe(true);
  });

  it("gives adult athletes private progress tracking and questionnaires", () => {
    const adult = buildAppCapabilities({
      role: "adult_athlete",
      programTier: "PHP_Premium",
      messagingAccessTiers,
      athleteType: "adult",
    });

    expect(adult.training).toBe(true);
    expect(adult.progressTracking).toBe(true);
    expect(adult.socialTracking).toBe(true);
    expect(adult.trainingQuestionnaire).toBe(true);
    expect(adult.parentContent).toBe(false);
    expect(adult.teamManagement).toBe(false);
  });

  it("keeps youth parent content separate from adult progress features", () => {
    const youth = buildAppCapabilities({
      role: "guardian",
      programTier: "PHP_Premium",
      messagingAccessTiers,
      athleteType: "youth",
    });

    expect(youth.parentContent).toBe(true);
    expect(youth.progressTracking).toBe(false);
    expect(youth.socialTracking).toBe(false);
  });

  it("enables team athlete team features without payment controls", () => {
    const teamAthlete = buildAppCapabilities({
      role: "team_athlete",
      programTier: "PHP",
      messagingAccessTiers,
      athleteType: "youth",
      hasTeam: true,
    });

    expect(teamAthlete.teamTracking).toBe(true);
    expect(teamAthlete.groupChat).toBe(true);
    expect(teamAthlete.nutrition).toBe(true);
    expect(teamAthlete.mobilePayments).toBe(false);
  });

  it("lets team managers manage team operations but not train", () => {
    const manager = buildAppCapabilities({
      role: "team_coach",
      programTier: null,
      messagingAccessTiers,
    });

    expect(manager.training).toBe(false);
    expect(manager.teamManagement).toBe(true);
    expect(manager.athleteManagement).toBe(true);
    expect(manager.routeManagement).toBe(true);
    expect(manager.eventManagement).toBe(true);
    expect(manager.mobilePayments).toBe(false);
  });
});
