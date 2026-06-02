import { buildAppCapabilities } from "../../src/services/app-capabilities.service";
import { featuresForTier, resolveEffectiveAccessFeatures } from "../../src/services/billing/feature-access.service";
import type { ProgramTierValue } from "../../src/services/messaging-policy.service";

describe("buildAppCapabilities", () => {
  const messagingAccessTiers: ProgramTierValue[] = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];

  it("keeps payments out of mobile-facing capabilities", () => {
    const adult = buildAppCapabilities({
      role: "adult_athlete",
      programTier: "PHP_Premium",
      messagingAccessTiers,
      athleteType: "adult",
      planFeatures: featuresForTier("PHP_Premium"),
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
      planFeatures: featuresForTier("PHP_Premium"),
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
      planFeatures: featuresForTier("PHP_Premium"),
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
      planFeatures: featuresForTier("PHP"),
    });

    expect(teamAthlete.teamTracking).toBe(true);
    expect(teamAthlete.groupChat).toBe(true);
    expect(teamAthlete.nutrition).toBe(false);
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
    expect(manager.teamTracking).toBe(false);
    expect(manager.runTracking).toBe(false);
    expect(manager.socialTracking).toBe(false);
  });

  it("gates team manager running and team feed capabilities by the managed team tier", () => {
    const manager = buildAppCapabilities({
      role: "team_coach",
      programTier: "PHP_Premium",
      messagingAccessTiers,
      planFeatures: featuresForTier("PHP_Premium"),
      hasActivePlan: true,
    });

    expect(manager.teamManagement).toBe(true);
    expect(manager.teamTracking).toBe(true);
    expect(manager.runTracking).toBe(true);
    expect(manager.socialTracking).toBe(true);
  });

  it("allows base plan access when tier is missing but user has an active plan", () => {
    const athleteWithPlanNoTier = buildAppCapabilities({
      role: "adult_athlete",
      programTier: null,
      messagingAccessTiers,
      athleteType: "adult",
      hasActivePlan: true,
      planFeatures: featuresForTier("PHP"),
    });

    expect(athleteWithPlanNoTier.schedule).toBe(true);
    expect(athleteWithPlanNoTier.coachBooking).toBe(false);
    expect(athleteWithPlanNoTier.messaging).toBe(true);
    expect(athleteWithPlanNoTier.coachVideoUpload).toBe(false);
  });

  it("keeps PHP Program restricted from premium-only app areas", () => {
    const program = buildAppCapabilities({
      role: "adult_athlete",
      programTier: "PHP",
      messagingAccessTiers,
      athleteType: "adult",
      planFeatures: featuresForTier("PHP"),
      hasActivePlan: true,
    });

    expect(program.training).toBe(true);
    expect(program.schedule).toBe(true);
    expect(program.coachBooking).toBe(false);
    expect(program.nutrition).toBe(false);
    expect(program.coachVideoUpload).toBe(false);
    expect(program.physioReferrals).toBe(false);
    expect(program.socialTracking).toBe(false);
  });

  it("gives Premium full digital app access", () => {
    const premium = buildAppCapabilities({
      role: "adult_athlete",
      programTier: "PHP_Premium",
      messagingAccessTiers,
      athleteType: "adult",
      planFeatures: featuresForTier("PHP_Premium"),
      hasActivePlan: true,
    });

    expect(premium.coachBooking).toBe(true);
    expect(premium.nutrition).toBe(true);
    expect(premium.coachVideoUpload).toBe(true);
    expect(premium.physioReferrals).toBe(true);
    expect(premium.socialTracking).toBe(true);
    expect(premium.runTracking).toBe(true);
    expect(premium.achievements).toBe(true);
  });

  it("lets a manual higher tier override a lower paid tier", () => {
    const features = resolveEffectiveAccessFeatures({
      paidPlan: { tier: "PHP" },
      overrideTier: "PHP_Premium",
    });

    expect(features.has("schedule")).toBe(true);
    expect(features.has("video_upload")).toBe(true);
    expect(features.has("physio_referrals")).toBe(true);
    expect(features.has("social_feed")).toBe(true);
  });

  it("lets a manual lower tier override a higher paid tier", () => {
    const features = resolveEffectiveAccessFeatures({
      paidPlan: { tier: "PHP_Pro" },
      overrideTier: "PHP",
    });

    expect(features.has("schedule")).toBe(true);
    expect(features.has("video_upload")).toBe(false);
    expect(features.has("physio_referrals")).toBe(false);
    expect(features.has("social_feed")).toBe(false);
  });
});
