import { Skeleton } from "@/components/Skeleton";
import { useRefreshContext } from "@/context/RefreshContext";
import React from "react";
import { View } from "react-native";

export function GuardianDashboard() {
  const { isLoading } = useRefreshContext();

  return (
    <View className="gap-8">
      {isLoading ? (
        <View className="bg-input p-6 rounded-[28px] shadow-sm border border-app h-24 justify-center">
          <Skeleton width="45%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={14} />
        </View>
      ) : null}
    </View>
  );
}
