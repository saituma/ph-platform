import { useMemo } from "react";
import { useActingUser } from "@/hooks/useActingUser";
import { useAppSelector } from "@/store/hooks";

/**
 * Messaging should always resolve threads for the signed-in principal.
 * Using X-Acting-User-Id here can scope inbox queries to an athlete context
 * that has no direct/group threads, which makes the tab look empty.
 */
export function useChatActingUser() {
  const base = useActingUser();
  const profileId = useAppSelector((state) => state.user.profile.id);
  const profileName = useAppSelector((state) => state.user.profile.name);
  return useMemo(
    () => ({
      ...base,
      actingUserId: null,
      actingHeaders: undefined,
      effectiveProfileId: Number.isFinite(Number(profileId))
        ? Number(profileId)
        : 0,
      effectiveProfileName: String(profileName ?? "").trim() || "You",
    }),
    [base, profileId, profileName],
  );
}
