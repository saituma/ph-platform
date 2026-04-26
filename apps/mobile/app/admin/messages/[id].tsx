import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { isAdminRole } from "@/lib/isAdminRole";
import ThreadScreen from "@/app/messages/[id]";
import { useAppSelector } from "@/store/hooks";
import React from "react";

export default function AdminThreadScreen() {
  const { appRole, apiUserRole } = useAppSelector((state) => state.user);
  const canAccess = isAdminRole(apiUserRole) || appRole === "coach";

  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  return <ThreadScreen />;
}

