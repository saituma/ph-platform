import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lock } from "lucide-react-native";

import { SleepDashboard } from "@/components/sleep/SleepDashboard";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";

export default function SleepScreen() {
  const p = useAdminPastel();

  return <SleepDashboard />;
}
