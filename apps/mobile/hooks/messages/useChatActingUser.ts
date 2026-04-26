import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { ManagedAthlete } from "@/store/slices/userSlice";

export function useChatActingUser() {
  const { profile, athleteUserId, appRole, apiUserRole } = useAppSelector(
    (state) => state.user,
  );
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);

  const actingUserId = useMemo(() => {
    const normalizedRole = String(apiUserRole ?? "").trim().toLowerCase();
    const isStaffRole =
      appRole === "team_manager" ||
      appRole === "coach" ||
      normalizedRole === "admin" ||
      normalizedRole === "superadmin" ||
      normalizedRole === "coach" ||
      normalizedRole === "team_coach" ||
      normalizedRole === "program_coach";
    if (isStaffRole) return null;

    const raw = athleteUserId ? Number(athleteUserId) : NaN;
    if (!Number.isFinite(raw) || raw <= 0) return null;

    if (Array.isArray(managedAthletes) && managedAthletes.length > 0) {
      const byUserId = managedAthletes.find(
        (athlete: ManagedAthlete) => String(athlete?.userId) === String(raw),
      );
      if (byUserId?.userId) {
        const userId = Number(byUserId.userId);
        if (Number.isFinite(userId) && userId > 0) return userId;
      }

      const byAthleteId = managedAthletes.find(
        (athlete: ManagedAthlete) => String(athlete?.id) === String(raw),
      );
      if (byAthleteId?.userId) {
        const userId = Number(byAthleteId.userId);
        if (Number.isFinite(userId) && userId > 0) return userId;
      }
    }

    return raw;
  }, [apiUserRole, appRole, athleteUserId, managedAthletes]);

  const actingHeaders = useMemo(() => {
    if (!actingUserId) return undefined;
    return { "X-Acting-User-Id": String(actingUserId) };
  }, [actingUserId]);

  const effectiveProfileId = useMemo(() => {
    if (actingUserId) return actingUserId;
    const id = profile.id ? Number(profile.id) : 0;
    return Number.isFinite(id) ? id : 0;
  }, [actingUserId, profile.id]);

  const effectiveProfileName = useMemo(() => {
    const actingId = actingUserId ? Number(actingUserId) : NaN;
    if (
      Number.isFinite(actingId) &&
      actingId > 0 &&
      Array.isArray(managedAthletes)
    ) {
      const found =
        managedAthletes.find(
          (athlete: ManagedAthlete) =>
            athlete?.userId === actingId || athlete?.id === actingId,
        ) ?? null;
      const name = found?.name ? String(found.name).trim() : "";
      if (name) return name;
    }
    const fallback = profile?.name ? String(profile.name).trim() : "";
    return fallback || "You";
  }, [actingUserId, managedAthletes, profile?.name]);

  return {
    actingUserId,
    actingHeaders,
    effectiveProfileId,
    effectiveProfileName,
  };
}
