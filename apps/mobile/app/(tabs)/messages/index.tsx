import { MessagesHome } from "@/components/messages/MessagesHome";
import { useAppSelector } from "@/store/hooks";
import React from "react";

export default function MessagesTabScreen() {
  const appRole = useAppSelector((state) => state.user.appRole);

  const mode =
    appRole === "adult_athlete"
      ? "adult"
      : typeof appRole === "string" && appRole.startsWith("youth_")
        ? "youth"
        : "team";

  return <MessagesHome mode={mode} />;
}

