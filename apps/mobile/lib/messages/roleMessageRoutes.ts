import { isAdminRole } from "@/lib/isAdminRole";

export type MessagesRolePrefix = "admin" | "team" | "adult" | "youth";

export function getMessagesRolePrefix(params: {
  appRole?: string | null;
  apiUserRole?: string | null;
}): MessagesRolePrefix {
  const { appRole, apiUserRole } = params;

  if (isAdminRole(apiUserRole) || appRole === "coach") return "admin";
  if (appRole === "adult_athlete") return "adult";
  if (
    appRole === "youth_athlete_team_guardian" ||
    appRole === "adult_athlete_team"
  )
    return "team";
  if (typeof appRole === "string" && appRole.startsWith("youth_"))
    return "youth";

  return "adult";
}

export function messagesThreadHref(
  prefix: MessagesRolePrefix,
  threadId: string,
) {
  return `/${prefix}/messages/${encodeURIComponent(threadId)}` as const;
}

export const messagesTabHref = "/(tabs)/messages" as const;

