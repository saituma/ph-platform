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
  const capabilities = useAppSelector((s) => s.user.capabilities);

  if (capabilities?.sleep === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Lock size={32} color={p.textMuted} />
        <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 16, color: p.textMuted }}>
          Not available on your plan
        </Text>
      </SafeAreaView>
    );
  }

  return <SleepDashboard />;
}
