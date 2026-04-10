import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";

interface TeamMemberListProps {
  members: {
    athleteId: number;
    athleteName: string | null;
    currentProgramTier: string | null;
  }[];
  isLoading: boolean;
  isDark: boolean;
  canLoad: boolean;
}

export function TeamMemberList({ members, isLoading, isDark, canLoad }: TeamMemberListProps) {
  const itemBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)";
  const itemBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  if (!canLoad) {
    return <Text className="text-sm font-outfit text-secondary">Waiting for auth bootstrap…</Text>;
  }

  if (isLoading && members.length === 0) {
    return (
      <View className="gap-2">
        <Skeleton width="70%" height={16} />
        <Skeleton width="55%" height={16} />
      </View>
    );
  }

  if (members.length === 0) {
    return <Text className="text-sm font-outfit text-secondary">No members yet.</Text>;
  }

  return (
    <View className="gap-3">
      {members.map((m) => (
        <View
          key={m.athleteId}
          className="rounded-2xl border px-4 py-3"
          style={{ backgroundColor: itemBg, borderColor: itemBorder }}
        >
          <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
            {m.athleteName ?? `Athlete #${m.athleteId}`}
          </Text>
          {m.currentProgramTier && (
            <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
              {m.currentProgramTier}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
