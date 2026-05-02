import { describe, expect, it } from "vitest";
import {
  hasActivePortalSubscription,
  isCoachPortalUser,
  getCoachTeamPortalPlanSummary,
} from "#/lib/portal-access";
import type { PortalUser } from "@/portal/portal-types";

function makeUser(overrides: Partial<PortalUser> = {}): PortalUser {
  return {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    role: "athlete",
    ...overrides,
  };
}

const futureDate = new Date(Date.now() + 86400000).toISOString();
const pastDate = new Date(Date.now() - 86400000).toISOString();

describe("portal-access", () => {
  describe("hasActivePortalSubscription", () => {
    it("returns false for athlete with no programTier", () => {
      expect(hasActivePortalSubscription(makeUser())).toBe(false);
    });

    it("returns false for athlete with programTier but no planExpiresAt", () => {
      expect(
        hasActivePortalSubscription(makeUser({ programTier: "gold" })),
      ).toBe(false);
    });

    it("returns false for athlete with programTier and expired plan", () => {
      expect(
        hasActivePortalSubscription(
          makeUser({ programTier: "gold", planExpiresAt: pastDate }),
        ),
      ).toBe(false);
    });

    it("returns true for athlete with programTier and future planExpiresAt", () => {
      expect(
        hasActivePortalSubscription(
          makeUser({ programTier: "gold", planExpiresAt: futureDate }),
        ),
      ).toBe(true);
    });

    it("returns true when team has active subscription with future expiry", () => {
      const user = makeUser({
        team: {
          id: 10,
          name: "Team A",
          minAge: null,
          maxAge: null,
          maxAthletes: 20,
          planId: 5,
          subscriptionStatus: "active",
          planExpiresAt: futureDate,
          createdAt: null,
          updatedAt: null,
        },
      });
      expect(hasActivePortalSubscription(user)).toBe(true);
    });

    it("returns false when team subscription is expired", () => {
      const user = makeUser({
        team: {
          id: 10,
          name: "Team A",
          minAge: null,
          maxAge: null,
          maxAthletes: 20,
          planId: 5,
          subscriptionStatus: "active",
          planExpiresAt: pastDate,
          createdAt: null,
          updatedAt: null,
        },
      });
      expect(hasActivePortalSubscription(user)).toBe(false);
    });

    it("returns false when team subscription status is not active", () => {
      const user = makeUser({
        team: {
          id: 10,
          name: "Team A",
          minAge: null,
          maxAge: null,
          maxAthletes: 20,
          planId: 5,
          subscriptionStatus: "cancelled",
          planExpiresAt: futureDate,
          createdAt: null,
          updatedAt: null,
        },
      });
      expect(hasActivePortalSubscription(user)).toBe(false);
    });

    it("returns true when team active with no planExpiresAt", () => {
      const user = makeUser({
        team: {
          id: 10,
          name: "Team A",
          minAge: null,
          maxAge: null,
          maxAthletes: 20,
          planId: 5,
          subscriptionStatus: "active",
          planExpiresAt: null,
          createdAt: null,
          updatedAt: null,
        },
      });
      expect(hasActivePortalSubscription(user)).toBe(true);
    });

    it("returns false for coach role even with programTier", () => {
      expect(
        hasActivePortalSubscription(
          makeUser({ role: "coach", programTier: "gold", planExpiresAt: futureDate }),
        ),
      ).toBe(false);
    });

    it("returns false for team_coach role without team subscription", () => {
      expect(
        hasActivePortalSubscription(makeUser({ role: "team_coach" })),
      ).toBe(false);
    });
  });

  describe("isCoachPortalUser", () => {
    it("returns true for coach", () => {
      expect(isCoachPortalUser(makeUser({ role: "coach" }))).toBe(true);
    });

    it("returns true for team_coach", () => {
      expect(isCoachPortalUser(makeUser({ role: "team_coach" }))).toBe(true);
    });

    it("returns true for program_coach", () => {
      expect(isCoachPortalUser(makeUser({ role: "program_coach" }))).toBe(true);
    });

    it("returns false for athlete", () => {
      expect(isCoachPortalUser(makeUser({ role: "athlete" }))).toBe(false);
    });

    it("returns false for guardian", () => {
      expect(isCoachPortalUser(makeUser({ role: "guardian" }))).toBe(false);
    });
  });

  describe("getCoachTeamPortalPlanSummary", () => {
    it("returns pending when no team", () => {
      const result = getCoachTeamPortalPlanSummary(makeUser({ team: null }));
      expect(result.title).toContain("pending");
    });

    it("returns no plan when team has no planId", () => {
      const user = makeUser({
        team: {
          id: 10,
          name: "My Team",
          minAge: null,
          maxAge: null,
          maxAthletes: 20,
          planId: null,
          subscriptionStatus: null,
          planExpiresAt: null,
          createdAt: null,
          updatedAt: null,
        },
      });
      const result = getCoachTeamPortalPlanSummary(user);
      expect(result.title).toContain("No team plan");
      expect(result.subtitle).toContain("My Team");
    });

    it("returns active when team subscription is active", () => {
      const user = makeUser({
        team: {
          id: 10,
          name: "Team X",
          minAge: null,
          maxAge: null,
          maxAthletes: 20,
          planId: 3,
          subscriptionStatus: "active",
          planExpiresAt: futureDate,
          createdAt: null,
          updatedAt: null,
        },
      });
      const result = getCoachTeamPortalPlanSummary(user);
      expect(result.title).toContain("active");
      expect(result.subtitle).toBe("Team X");
      expect(result.expiresAt).toBe(futureDate);
    });

    it("returns status string for non-active subscription", () => {
      const user = makeUser({
        team: {
          id: 10,
          name: "Team Y",
          minAge: null,
          maxAge: null,
          maxAthletes: 20,
          planId: 3,
          subscriptionStatus: "past_due",
          planExpiresAt: null,
          createdAt: null,
          updatedAt: null,
        },
      });
      const result = getCoachTeamPortalPlanSummary(user);
      expect(result.title).toContain("past due");
    });
  });
});
