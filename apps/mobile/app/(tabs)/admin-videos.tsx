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

type AdminVideoItem = Record<string, any> & {
  id?: number | string;
  athleteName?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  reviewedAt?: string | null;
};

export default function AdminVideosScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const [items, setItems] = useState<AdminVideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ items?: AdminVideoItem[] }>(
          "/admin/videos?limit=50",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load videos");
        setItems([]);
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
    return `${items.length} items`;
  }, [error, items.length, loading]);

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
                Videos
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
          {loading && items.length === 0 ? (
            <View className="gap-2">
              <Skeleton width="90%" height={14} />
              <Skeleton width="82%" height={14} />
              <Skeleton width="88%" height={14} />
            </View>
          ) : error ? (
            <Text selectable className="text-sm font-outfit text-red-400">
              {error}
            </Text>
          ) : items.length === 0 ? (
            <Text className="text-sm font-outfit text-secondary">
              No videos found.
            </Text>
          ) : (
            <View className="gap-3">
              {items.map((v, idx) => {
                const title =
                  typeof v.athleteName === "string" && v.athleteName.trim()
                    ? v.athleteName.trim()
                    : `Video ${String(v.id ?? idx)}`;
                const status = v.reviewedAt ? "Reviewed" : "Pending";
                const note = typeof v.notes === "string" ? v.notes : null;

                return (
                  <View
                    key={String(v.id ?? idx)}
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
                    <View className="flex-row items-center justify-between gap-3">
                      <Text
                        className="text-[13px] font-clash font-bold text-app flex-1"
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <Text
                        className="text-[11px] font-outfit text-secondary"
                        numberOfLines={1}
                      >
                        {status}
                      </Text>
                    </View>
                    {note ? (
                      <Text
                        className="text-[12px] font-outfit text-secondary mt-1"
                        numberOfLines={2}
                      >
                        {note}
                      </Text>
                    ) : null}
                    {v.createdAt ? (
                      <Text
                        selectable
                        className="text-[11px] font-outfit text-secondary mt-1"
                        numberOfLines={1}
                      >
                        {String(v.createdAt)}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ThemedScrollView>
    </View>
  );
}
