import { describe, it, expect } from "vitest";
import { isPortalCoachLikeRole, showPortalNutritionNav, showPortalPhysioReferralNav } from "#/lib/portal-roles";

describe("Portal Role-based Navigation", () => {
  describe("isPortalCoachLikeRole", () => {
    it("returns true for coach", () => {
      expect(isPortalCoachLikeRole("coach")).toBe(true);
    });

    it("returns true for team_coach", () => {
      expect(isPortalCoachLikeRole("team_coach")).toBe(true);
    });

    it("returns true for program_coach", () => {
      expect(isPortalCoachLikeRole("program_coach")).toBe(true);
    });

    it("returns false for athlete", () => {
      expect(isPortalCoachLikeRole("athlete")).toBe(false);
    });

    it("returns false for youth_athlete", () => {
      expect(isPortalCoachLikeRole("youth_athlete")).toBe(false);
    });

    it("returns false for adult_athlete", () => {
      expect(isPortalCoachLikeRole("adult_athlete")).toBe(false);
    });

    it("returns false for guardian", () => {
      expect(isPortalCoachLikeRole("guardian")).toBe(false);
    });

    it("handles undefined/null", () => {
      expect(isPortalCoachLikeRole(undefined)).toBe(false);
      expect(isPortalCoachLikeRole(null as any)).toBe(false);
    });
  });

  describe("showPortalNutritionNav", () => {
    it("shows for athlete roles", () => {
      expect(showPortalNutritionNav("athlete")).toBe(true);
    });

    it("shows for youth_athlete", () => {
      expect(showPortalNutritionNav("youth_athlete")).toBe(true);
    });

    it("shows for adult_athlete", () => {
      expect(showPortalNutritionNav("adult_athlete")).toBe(true);
    });

    it("shows for team_athlete", () => {
      expect(showPortalNutritionNav("team_athlete")).toBe(true);
    });

    it("shows for guardian", () => {
      expect(showPortalNutritionNav("guardian")).toBe(true);
    });

    it("shows for program_coach", () => {
      expect(showPortalNutritionNav("program_coach")).toBe(true);
    });

    it("shows for admin", () => {
      expect(showPortalNutritionNav("admin")).toBe(true);
    });

    it("shows for superAdmin", () => {
      expect(showPortalNutritionNav("superAdmin")).toBe(true);
    });

    it("hides for team-facing coach", () => {
      expect(showPortalNutritionNav("coach")).toBe(false);
    });

    it("hides for team_coach", () => {
      expect(showPortalNutritionNav("team_coach")).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(showPortalNutritionNav(undefined)).toBe(false);
    });
  });

  describe("showPortalPhysioReferralNav", () => {
    it("shows for athlete", () => {
      expect(showPortalPhysioReferralNav("athlete")).toBe(true);
    });

    it("shows for youth_athlete", () => {
      expect(showPortalPhysioReferralNav("youth_athlete")).toBe(true);
    });

    it("shows for guardian", () => {
      expect(showPortalPhysioReferralNav("guardian")).toBe(true);
    });

    it("hides for coach", () => {
      expect(showPortalPhysioReferralNav("coach")).toBe(false);
    });

    it("hides for admin", () => {
      expect(showPortalPhysioReferralNav("admin")).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(showPortalPhysioReferralNav(undefined)).toBe(false);
    });
  });
});
