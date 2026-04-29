import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { subscribeToAdminOpsRequests } from "@/context/AdminOpsContext";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Feather } from "@/components/ui/theme-icons";
import { AdminHeader, AdminScreen } from "@/components/admin/AdminUI";

const OPS_ITEMS = [
  {
    icon: "calendar",
    title: "Schedule",
    subtitle: "Bookings, service types, availability, pending requests.",
    color: "#FFB020",
    destination: "schedule" as const,
  },
  {
    icon: "clipboard",
    title: "Nutrition",
    subtitle: "Nutrition + wellness logs, coach feedback, video response.",
    color: "#34C759",
    destination: "nutrition" as const,
  },
  {
    icon: "activity",
    title: "Referrals",
    subtitle: "Manage referral logs and partner links.",
    color: "#30B0C7",
    destination: "referrals" as const,
  },
] as const;

export default function AdminOpsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
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

  const handleNav = (destination: typeof OPS_ITEMS[number]["destination"]) => {
    if (destination === "schedule") return pushSchedule();
    if (destination === "nutrition") return router.push("/admin/ops/nutrition");
    if (destination === "referrals") return router.push("/admin/ops/referrals");
  };

  return (
    <AdminScreen>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(380).springify()}
          style={{ marginBottom: 18 }}
        >
          <AdminHeader
            eyebrow="Operations"
            title="Ops Hub"
            subtitle="Schedules, nutrition, and referral tools"
            tone="warning"
          />
        </Animated.View>

        {!bootstrapReady ? (
          <View
            style={{
              marginHorizontal: 24,
              padding: 24,
              borderRadius: 22,
              borderWidth: 1,
              backgroundColor: isDark ? colors.cardElevated : colors.card,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Admin tools will load after auth bootstrap.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, gap: 14 }}>
            {OPS_ITEMS.map((item, idx) => (
              <Animated.View key={item.destination} entering={reduceMotion ? undefined : FadeInDown.delay(120 + idx * 70).duration(380).springify()}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleNav(item.destination)}
                  style={({ pressed }) => ({
                    borderRadius: 22,
                    borderWidth: 1,
                    backgroundColor: isDark ? colors.cardElevated : colors.card,
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                    overflow: "hidden",
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  })}
                >
                  {/* Colored top strip */}
                  <View
                    style={{
                      height: 3,
                      backgroundColor: item.color,
                    }}
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", padding: 20 }}>
                    {/* Icon block */}
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: isDark ? `${item.color}20` : `${item.color}14`,
                        borderWidth: 1,
                        borderColor: isDark ? `${item.color}30` : `${item.color}22`,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <Feather name={item.icon as any} size={24} color={item.color} />
                    </View>
                    {/* Text */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Outfit-Bold",
                          fontSize: 17,
                          color: colors.textPrimary,
                          letterSpacing: -0.2,
                          marginBottom: 3,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Outfit-Regular",
                          fontSize: 13,
                          color: colors.textSecondary,
                          lineHeight: 18,
                        }}
                        numberOfLines={2}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={isDark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.30)"}
                      style={{ marginLeft: 12 }}
                    />
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </ThemedScrollView>
    </AdminScreen>
  );
}
