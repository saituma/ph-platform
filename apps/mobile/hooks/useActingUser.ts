/**
 * Single answer to "who am I acting as right now?"
 *
 * All role-based acting user resolution lives here. SocketContext, message
 * controllers, and capability checks all call this hook — none of them
 * duplicate the isStaffRole or athlete-lookup logic.
 */
import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectIsStaffRole } from "@/store/slices/userSlice";
import type { ManagedAthlete } from "@/store/slices/userSlice";

export type ActingUser = {
  /** Null when user is staff or when no valid athlete target is selected. */
  actingUserId: number | null;
  /** HTTP header to pass to API calls that scope to the acting user. */
  actingHeaders: Record<string, string> | undefined;
  /**
   * The numeric user ID that should be used as the "me" identifier.
   * Falls back to the signed-in profile ID when not acting.
   */
  effectiveProfileId: number;
  /** Display name for the acting user (athlete name or own name). */
  effectiveProfileName: string;
  /** True when the current user is staff and acting mode is disabled. */
  isStaff: boolean;
};

function resolveActingUserId(
  athleteUserId: number | null,
  managedAthletes: ManagedAthlete[],
): number | null {
  const raw = athleteUserId ? Number(athleteUserId) : NaN;
  if (!Number.isFinite(raw) || raw <= 0) return null;

  if (managedAthletes.length > 0) {
    // Prefer userId match over id match (userId is the auth user ID).
    const byUserId = managedAthletes.find(
      (a) => String(a?.userId) === String(raw),
    );
    if (byUserId?.userId) {
      const uid = Number(byUserId.userId);
      if (Number.isFinite(uid) && uid > 0) return uid;
    }

    const byAthleteId = managedAthletes.find(
      (a) => String(a?.id) === String(raw),
    );
    if (byAthleteId?.userId) {
      const uid = Number(byAthleteId.userId);
      if (Number.isFinite(uid) && uid > 0) return uid;
    }
  }

  return raw;
}

export function useActingUser(): ActingUser {
  const profile = useAppSelector((state) => state.user.profile);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const isStaff = useAppSelector(selectIsStaffRole);

  const actingUserId = useMemo(() => {
    if (isStaff) return null;
    return resolveActingUserId(athleteUserId, managedAthletes);
  }, [isStaff, athleteUserId, managedAthletes]);

  const actingHeaders = useMemo(
    () =>
      actingUserId
        ? { "X-Acting-User-Id": String(actingUserId) }
        : undefined,
    [actingUserId],
  );

  const effectiveProfileId = useMemo(() => {
    if (actingUserId) return actingUserId;
    const id = profile.id ? Number(profile.id) : 0;
    return Number.isFinite(id) ? id : 0;
  }, [actingUserId, profile.id]);

  const effectiveProfileName = useMemo(() => {
    if (actingUserId && managedAthletes.length > 0) {
      const found =
        managedAthletes.find(
          (a) => a?.userId === actingUserId || a?.id === actingUserId,
        ) ?? null;
      const name = found?.name ? String(found.name).trim() : "";
      if (name) return name;
    }
    const fallback = profile?.name ? String(profile.name).trim() : "";
    return fallback || "You";
  }, [actingUserId, managedAthletes, profile?.name]);

  return { actingUserId, actingHeaders, effectiveProfileId, effectiveProfileName, isStaff };
}
