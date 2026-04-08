import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AdminUser = {
  id?: number | string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  blocked?: boolean | null;
};

export default function AdminUsersScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ users?: AdminUser[] }>(
          "/admin/users?limit=50",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setUsers(Array.isArray(res?.users) ? res.users : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const headerLine = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "Error";
    return `${users.length} users`;
  }, [error, loading, users.length]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-4xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Users
              </Text>
              <Text
                className="text-[12px] font-outfit text-secondary"
                numberOfLines={1}
              >
                {headerLine}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {loading && users.length === 0 ? (
            <View className="gap-2">
              <Skeleton width="85%" height={14} />
              <Skeleton width="92%" height={14} />
              <Skeleton width="78%" height={14} />
            </View>
          ) : error ? (
            <Text selectable className="text-sm font-outfit text-red-400">
              {error}
            </Text>
          ) : users.length === 0 ? (
            <Text className="text-sm font-outfit text-secondary">
              No users found.
            </Text>
          ) : (
            <View className="gap-3">
              {users.map((u, idx) => (
                <View
                  key={String(u.id ?? idx)}
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(15,23,42,0.03)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(15,23,42,0.06)",
                  }}
                >
                  <Text
                    className="text-[13px] font-clash font-bold text-app"
                    numberOfLines={1}
                  >
                    {u.name ?? "(no name)"}
                  </Text>
                  <Text
                    selectable
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={1}
                  >
                    {u.email ?? ""}
                  </Text>
                  <View className="flex-row items-center gap-3 mt-1">
                    <Text
                      className="text-[11px] font-outfit text-secondary"
                      numberOfLines={1}
                    >
                      Role: {u.role ?? "—"}
                    </Text>
                    {u.blocked ? (
                      <Text
                        className="text-[11px] font-outfit text-red-400"
                        numberOfLines={1}
                      >
                        Blocked
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>
    </View>
  );
}
