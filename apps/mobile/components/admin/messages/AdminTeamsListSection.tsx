import React, { useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { SmallAction } from "@/components/admin/AdminShared";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";

type Props = {
  controller: ReturnType<typeof useAdminTeams>;
  canLoad: boolean;
};

export function AdminTeamsListSection({ controller, canLoad }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!canLoad) return;
    void controller.load(false);
  }, [canLoad, controller.load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return controller.teams;
    return controller.teams.filter((t) =>
      String(t.team ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [controller.teams, query]);

  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <View className="flex-1 rounded-2xl border border-app/10 bg-card px-4 py-3">
          <TextInput
            className="text-[14px] font-outfit text-app"
            value={query}
            onChangeText={setQuery}
            placeholder="Search teams..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <SmallAction
          label="Refresh"
          tone="neutral"
          onPress={() => void controller.load(true)}
          disabled={controller.loading}
        />
      </View>

      {controller.loading && controller.teams.length === 0 ? (
        <View className="gap-2">
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
        </View>
      ) : controller.error ? (
        <Text className="text-sm font-outfit text-danger">{controller.error}</Text>
      ) : filtered.length === 0 ? (
        <Text className="text-sm font-outfit text-secondary">No teams found.</Text>
      ) : (
        <View className="gap-3">
          {filtered.map((team) => (
            <Pressable
              key={team.team}
              onPress={() =>
                router.push(`/admin-teams/${encodeURIComponent(team.team)}`)
              }
              className="rounded-card border border-app/10 bg-card p-4 active:opacity-90"
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[14px] font-clash font-bold text-app" numberOfLines={1}>
                    {team.team}
                  </Text>
                  <Text className="text-[11px] font-outfit text-secondary mt-1" numberOfLines={1}>
                    {team.memberCount} athletes · {team.guardianCount} guardians
                  </Text>
                </View>
                <View className="bg-background-secondary px-3 py-1.5 rounded-full border border-app/10">
                  <Text className="text-[11px] font-outfit-bold text-app">
                    Open
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

