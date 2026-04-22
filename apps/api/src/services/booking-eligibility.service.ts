import { isTeamAthleteRole, isTrainingStaff } from "../lib/user-roles";
import { getAthleteForUser, getUserById } from "./user.service";

const PAID_PROGRAM_TIERS = new Set(["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"]);

/**
 * Session booking is limited to athletes with an assigned paid program tier (post coach approval).
 * Free / onboarding-only users may view schedule but cannot create bookings.
 */
export async function assertUserCanCreateBooking(userId: number) {
  const user = await getUserById(userId);
  if (user && isTeamAthleteRole(user.role)) {
    throw new Error("BOOKING_TEAM_ATHLETE_SELF_SERVE_DISABLED");
  }

  if (user && isTrainingStaff(user.role)) {
    return;
  }

  const athlete = await getAthleteForUser(userId);
  if (!athlete?.currentProgramTier) {
    throw new Error("BOOKING_REQUIRES_ACTIVE_PLAN");
  }
  if (!PAID_PROGRAM_TIERS.has(athlete.currentProgramTier)) {
    throw new Error("BOOKING_REQUIRES_ACTIVE_PLAN");
  }
}
