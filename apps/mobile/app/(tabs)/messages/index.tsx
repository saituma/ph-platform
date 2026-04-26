import { MessagesHome } from "@/components/messages/MessagesHome";
import { useAppSelector } from "@/store/hooks";
import React from "react";

export default function MessagesTabScreen() {
  const appRole = useAppSelector((state) => state.user.appRole);

  const mode =
    appRole === "adult_athlete"
      ? "adult"
      : appRole === "adult_athlete_team" ||
          appRole === "youth_athlete_team_guardian" ||
          appRole === "team" ||
          appRole === "team_manager"
        ? "team"
      : typeof appRole === "string" && appRole.startsWith("youth_")
        ? "youth"
        : "team";

  return <MessagesHome mode={mode} />;
}
