import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AdminDashboard = {
  totalAthletes?: number;
  premiumClients?: number;
  unreadMessages?: number;
  bookingsToday?: number;
  tierCounts?: Record<string, number>;
  priorityQueue?: { title?: string; detail?: string; status?: string }[];
};

type HomeDetail =
  | { kind: "stat"; label: string; value: string }
  | { kind: "priority"; title: string; detail: string; status?: string };

export default function AdminHomeScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState<HomeDetail | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<AdminDashboard>("/admin/dashboard", {
          token,
          suppressStatusCodes: [403],
          skipCache: forceRefresh,
          forceRefresh,
        });
        setData(res ?? null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load admin dashboard",
        );
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const stats = useMemo(
    () => [
      { label: "Athletes", value: data?.totalAthletes ?? null },
      { label: "Premium", value: data?.premiumClients ?? null },
      { label: "Unread", value: data?.unreadMessages ?? null },
      { label: "Bookings", value: data?.bookingsToday ?? null },
    ],
    [
      data?.bookingsToday,
      data?.premiumClients,
      data?.totalAthletes,
      data?.unreadMessages,
    ],
  );

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
        <View className="pt-6 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1 mr-4 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text
              className="text-4xl font-telma-bold text-app tracking-tight"
              numberOfLines={1}
            >
              Admin
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <View className="flex-row gap-3 mb-3">
            <ActionButton
              icon="users"
              label="Users"
              color="bg-accent"
              onPress={() => requestGlobalTabChange(2)}
            />
            <ActionButton
              icon="video"
              label="Videos"
              color="bg-accent"
              onPress={() => requestGlobalTabChange(1)}
            />
            <ActionButton
              icon="layers"
              label="Content"
              color="bg-accent"
              onPress={() => requestGlobalTabChange(3)}
            />
            <ActionButton
              icon="settings"
              label="Ops"
              color="bg-accent"
              onPress={() => requestGlobalTabChange(4)}
            />
          </View>
        </View>

        <View
          className="rounded-[28px] border p-5 mb-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <Text className="text-base font-clash font-bold text-app mb-3">
            Today
          </Text>

          {loading && !data ? (
            <View className="gap-2">
              <Skeleton width="70%" height={16} />
              <Skeleton width="55%" height={16} />
              <Skeleton width="60%" height={16} />
            </View>
          ) : error ? (
            <Text selectable className="text-sm font-outfit text-red-400">
              {error}
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {stats.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={() =>
                    setDetail({
                      kind: "stat",
                      label: item.label,
                      value: item.value == null ? "—" : String(item.value),
                    })
                  }
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(15,23,42,0.03)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(15,23,42,0.06)",
                    minWidth: "47%",
                  }}
                >
                  <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1px]">
                    {item.label}
                  </Text>
                  <Text
                    className="text-2xl font-clash font-bold text-app"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {item.value == null ? "—" : String(item.value)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
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
          <Text className="text-base font-clash font-bold text-app mb-3">
            Priority queue
          </Text>
          {loading && !data ? (
            <View className="gap-2">
              <Skeleton width="90%" height={14} />
              <Skeleton width="75%" height={14} />
            </View>
          ) : (data?.priorityQueue?.length ?? 0) === 0 ? (
            <Text className="text-sm font-outfit text-secondary">
              No priority items.
            </Text>
          ) : (
            <View className="gap-3">
              {(data?.priorityQueue ?? []).map((item, idx) => (
                <Pressable
                  key={`${item.title ?? "item"}-${idx}`}
                  accessibilityRole="button"
                  onPress={() =>
                    setDetail({
                      kind: "priority",
                      title: item.title ?? "Item",
                      detail: item.detail ?? "",
                      status: item.status ?? undefined,
                    })
                  }
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
                    {item.title ?? "Item"}
                  </Text>
                  <Text
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={2}
                  >
                    {item.detail ?? ""}
                  </Text>
                  {item.status ? (
                    <Text
                      className="text-[11px] font-outfit text-secondary mt-1"
                      numberOfLines={1}
                    >
                      {item.status}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Modal
          visible={detail != null}
          animationType="slide"
          presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
          onRequestClose={() => setDetail(null)}
        >
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              backgroundColor: isDark ? colors.background : "#FFFFFF",
            }}
          >
            <ThemedScrollView
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24 + insets.bottom,
              }}
            >
              <View className="pt-4 mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-2xl font-clash font-bold text-app"
                    numberOfLines={1}
                  >
                    {detail?.kind === "stat"
                      ? detail.label
                      : (detail?.title ?? "Detail")}
                  </Text>
                  {detail?.kind === "stat" ? (
                    <Text className="text-[12px] font-outfit text-secondary">
                      From /admin/dashboard
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDetail(null)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      opacity: pressed ? 0.85 : 1,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(15,23,42,0.04)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.08)",
                    },
                  ]}
                >
                  <Text className="text-[12px] font-outfit-semibold text-app">
                    Close
                  </Text>
                </Pressable>
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
                {detail?.kind === "stat" ? (
                  <Text
                    className="text-4xl font-clash font-bold text-app"
                    style={{ fontVariant: ["tabular-nums"] }}
                    selectable
                  >
                    {detail.value}
                  </Text>
                ) : detail?.kind === "priority" ? (
                  <View className="gap-2">
                    <Text
                      className="text-[13px] font-clash font-bold text-app"
                      selectable
                    >
                      {detail.title}
                    </Text>
                    <Text
                      className="text-[12px] font-outfit text-secondary"
                      selectable
                    >
                      {detail.detail || "—"}
                    </Text>
                    {detail.status ? (
                      <Text
                        className="text-[11px] font-outfit text-secondary"
                        selectable
                      >
                        Status: {detail.status}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </ThemedScrollView>
          </View>
        </Modal>
      </ThemedScrollView>
    </View>
  );
}
