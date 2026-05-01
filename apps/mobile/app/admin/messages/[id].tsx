import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { selectIsStaffRole } from "@/store/slices/userSlice";
import ThreadScreen from "@/app/messages/[id]";
import { useAppSelector } from "@/store/hooks";
import React from "react";

export default function AdminThreadScreen() {
  const canAccess = useAppSelector(selectIsStaffRole);

  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  return <ThreadScreen />;
}

