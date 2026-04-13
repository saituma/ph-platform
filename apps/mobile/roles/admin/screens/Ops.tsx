import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { subscribeToAdminOpsRequests } from "@/context/AdminOpsContext";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Feather } from "@/components/ui/theme-icons";
import { AdminCard } from "@/roles/admin/components/AdminCard";

export default function AdminOpsScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const pushSchedule = useCallback(
    (params?: { tab?: "bookings" | "services" | "availability"; action?: string }) => {
      router.push({
        pathname: "/admin/ops/schedule",
        params: {
          ...(params?.tab ? { tab: params.tab } : {}),
          ...(params?.action ? { action: params.action } : {}),
        },
      } as any);
    },
    [router],
  );

  useEffect(() => {
    return subscribeToAdminOpsRequests((payload) => {
      if (payload.destination === "schedule") return pushSchedule();
      if (payload.destination === "nutrition") return router.push("/admin/ops/nutrition");
      if (payload.destination === "referrals") return router.push("/admin/ops/referrals");
      if (payload.destination === "hub") return;

      // ---- Legacy compatibility ----
      if (payload.section === "bookings") {
        return pushSchedule({
          tab: "bookings",
          action: payload.action === "createBooking" ? "createBooking" : undefined,
        });
      }
      if (payload.section === "services") {
        return pushSchedule({
          tab: "services",
          action: payload.action === "createService" ? "createService" : undefined,
        });
      }
      if (payload.section === "availability") {
        return pushSchedule({
          tab: "availability",
          action: payload.action === "createAvailability" ? "createAvailability" : undefined,
        });
      }
      if (payload.section === "teams") {
        router.push("/admin-teams");
        return;
      }
    });
  }, [pushSchedule, router]);

  function NavRow({
    icon,
    title,
    subtitle,
    onPress,
  }: {
    icon: any;
    title: string;
    subtitle: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <AdminCard>
          <View className="flex-row items-center">
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center border mr-4"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
              }}
            >
              <Feather name={icon} size={22} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-outfit-bold font-bold text-app tracking-tight">
                {title}
              </Text>
              <Text className="text-[12px] font-outfit text-secondary mt-0.5">
                {subtitle}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.35)"}
            />
          </View>
        </AdminCard>
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="pt-10 mb-8 px-6">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <Text
              className="text-5xl font-telma-bold text-app tracking-tight"
              numberOfLines={1}
            >
              Ops
            </Text>
          </View>
          <Text
            className="text-base font-outfit text-secondary leading-relaxed"
          >
            Manage schedules, nutrition logs, and referrals — aligned with the web admin tools.
          </Text>
        </View>

        {!bootstrapReady ? (
          <View className="px-6">
            <AdminCard>
              <Text className="text-sm font-outfit text-secondary text-center py-4">
                Admin tools will load after auth bootstrap.
              </Text>
            </AdminCard>
          </View>
        ) : (
          <View className="px-6 gap-4">
            <NavRow
              icon="calendar"
              title="Schedule"
              subtitle="Bookings, service types, availability, pending requests."
              onPress={() => pushSchedule()}
            />
            <NavRow
              icon="clipboard"
              title="Nutrition"
              subtitle="Nutrition + wellness logs, coach feedback, video response."
              onPress={() => router.push("/admin/ops/nutrition")}
            />
            <NavRow
              icon="activity"
              title="Referrals"
              subtitle="Manage referral logs and partner links."
              onPress={() => router.push("/admin/ops/referrals")}
            />
          </View>
        )}
      </ThemedScrollView>
    </View>
  );
}
