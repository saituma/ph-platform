import { getAthleteForUser } from "./user.service";

const PAID_PROGRAM_TIERS = new Set(["PHP", "PHP_Plus", "PHP_Premium"]);

/**
 * Session booking is limited to athletes with an assigned paid program tier (post coach approval).
 * Free / onboarding-only users may view schedule but cannot create bookings.
 */
export async function assertUserCanCreateBooking(userId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete?.currentProgramTier) {
    throw new Error("BOOKING_REQUIRES_ACTIVE_PLAN");
  }
  if (!PAID_PROGRAM_TIERS.has(athlete.currentProgramTier)) {
    throw new Error("BOOKING_REQUIRES_ACTIVE_PLAN");
  }
}
