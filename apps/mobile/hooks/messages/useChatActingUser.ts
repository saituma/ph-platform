import { useMemo } from "react";
import { useActingUser } from "@/hooks/useActingUser";

/**
 * Messaging should always resolve threads for the signed-in principal.
 * Using X-Acting-User-Id here can scope inbox queries to an athlete context
 * that has no direct/group threads, which makes the tab look empty.
 */
export function useChatActingUser() {
  const base = useActingUser();
  return useMemo(
    () => ({
      ...base,
      actingUserId: null,
      actingHeaders: undefined,
    }),
    [base],
  );
}
