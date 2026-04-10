import React, { useEffect, useState, useMemo } from "react";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";

import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { AdminUserDetailModal } from "@/components/admin/AdminUserDetailModal";
import { AdminUser } from "@/types/admin";

export default function AdminUsersScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const { users, loading, error, isBusy, load, updateBlockedStatus, deleteUser, updateProgramTier } = useAdminUsers(token, !!bootstrapReady);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) ?? null, [users, selectedUserId]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
        <View className="pt-6 mb-4 px-6">
          <View className="flex-row items-center gap-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text className="text-4xl font-telma-bold text-app tracking-tight">Users</Text>
              <Text className="text-[12px] font-outfit text-secondary">{loading ? "Loading..." : `${users.length} registered users`}</Text>
            </View>
          </View>
        </View>

        <View className="px-6">
          <View className="rounded-[28px] border p-5 bg-card" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", ...(isDark ? Shadows.none : Shadows.md) }}>
            {loading && users.length === 0 ? (
              <View className="gap-3"><Skeleton width="100%" height={60} /><Skeleton width="100%" height={60} /></View>
            ) : error ? (
              <Text className="text-red-400 font-outfit text-center">{error}</Text>
            ) : users.length === 0 ? (
              <Text className="text-secondary font-outfit text-center">No users found.</Text>
            ) : (
              <View className="gap-3">
                {users.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => u.id && setSelectedUserId(u.id)}
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <Text className="text-sm font-clash font-bold text-app">{u.name || "(no name)"}</Text>
                    <Text className="text-xs font-outfit text-secondary" numberOfLines={1}>{u.email}</Text>
                    <View className="flex-row gap-2 mt-1">
                      <Text className="text-[10px] font-outfit text-secondary uppercase tracking-wider">Role: {u.role}</Text>
                      {u.isBlocked && <Text className="text-[10px] font-outfit-bold text-red-400 uppercase tracking-wider">Blocked</Text>}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ThemedScrollView>

      <AdminUserDetailModal
        user={selectedUser}
        visible={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onToggleBlock={updateBlockedStatus}
        onDelete={deleteUser}
        onSaveTier={updateProgramTier}
        token={token}
        isBusy={isBusy}
      />
    </View>
  );
}
