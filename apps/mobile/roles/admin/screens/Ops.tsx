import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { subscribeToAdminOpsRequests } from "@/context/AdminOpsContext";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AdminHeader, AdminScreen } from "@/components/admin/AdminUI";
import { BookOpen, Calendar, ClipboardList, Activity, ChevronRight } from "lucide-react-native";

const OPS_ITEMS = [
  {
    icon: BookOpen,
    title: "Programs",
    subtitle: "Build and manage training programs, modules, and sessions.",
    colorKey: "cardSage" as const,
    destination: "programs" as const,
  },
  {
    icon: Calendar,
    title: "Schedule",
    subtitle: "Bookings, service types, availability, pending requests.",
    colorKey: "cardPeach" as const,
    destination: "schedule" as const,
  },
  {
    icon: ClipboardList,
    title: "Nutrition",
    subtitle: "Nutrition + wellness logs, coach feedback, video response.",
    colorKey: "cardMint" as const,
    destination: "nutrition" as const,
  },
  {
    icon: Activity,
    title: "Referrals",
    subtitle: "Manage referral logs and partner links.",
    colorKey: "cardLavender" as const,
    destination: "referrals" as const,
  },
] as const;

export default function AdminOpsScreen() {
  const pal = useAdminPastel();
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
    if (destination === "programs") return router.push("/admin/ops/programs");
    if (destination === "schedule") return pushSchedule();
    if (destination === "nutrition") return router.push("/admin/ops/nutrition");
    if (destination === "referrals") return router.push("/admin/ops/referrals");
  };

  return (
    <AdminScreen>
      <ThemedScrollView
        contentContainerStyle={{ paddingBottom: 40, backgroundColor: pal.pageBg }}
      >
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
              borderRadius: 28,
              backgroundColor: pal.cardWhite,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 14,
                color: pal.textSecondary,
                textAlign: "center",
              }}
            >
              Admin tools will load after auth bootstrap.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, gap: 16 }}>
            {OPS_ITEMS.map((item, idx) => {
              const IconComponent = item.icon;
              const cardBg = pal[item.colorKey];

              return (
                <Animated.View
                  key={item.destination}
                  entering={
                    reduceMotion
                      ? undefined
                      : FadeInDown.delay(120 + idx * 70)
                          .duration(380)
                          .springify()
                  }
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleNav(item.destination)}
                    style={({ pressed }) => ({
                      borderRadius: 28,
                      backgroundColor: cardBg,
                      overflow: "hidden",
                      opacity: pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 22,
                      }}
                    >
                      {/* Icon block */}
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 18,
                          backgroundColor: "rgba(255,255,255,0.55)",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 16,
                        }}
                      >
                        <IconComponent size={24} color={pal.textPrimary} strokeWidth={2} />
                      </View>
                      {/* Text */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Outfit-Bold",
                            fontSize: 17,
                            color: pal.textPrimary,
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
                            color: pal.textSecondary,
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                      {/* Pill chevron indicator */}
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "rgba(255,255,255,0.6)",
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: 12,
                        }}
                      >
                        <ChevronRight size={18} color={pal.textMuted} strokeWidth={2.5} />
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ThemedScrollView>
    </AdminScreen>
  );
}
