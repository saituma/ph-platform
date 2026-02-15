import { getGuardianAndAthlete } from "../services/user.service";

export async function resolveActingUserId(
  userId: number,
  actingUserIdHeader?: string | string[] | undefined
) {
  if (!actingUserIdHeader) return userId;
  const raw = Array.isArray(actingUserIdHeader) ? actingUserIdHeader[0] : actingUserIdHeader;
  const actingId = Number(raw);
  if (!Number.isFinite(actingId)) return userId;
  if (actingId === userId) return userId;
  const { athlete } = await getGuardianAndAthlete(userId);
  if (athlete?.userId === actingId) {
    return actingId;
  }
  throw new Error("FORBIDDEN_ACTING_USER");
}
