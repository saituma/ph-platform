import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminBookingsSection } from "@/components/admin/AdminBookingsSection";
import { AdminServicesSection } from "@/components/admin/AdminServicesSection";
import { useAdminServices } from "@/hooks/admin/useAdminServices";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter, usePathname } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@/components/ui/theme-icons";
import { isAdminRole } from "@/lib/isAdminRole";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { goBackOrFallbackTabs } from "@/lib/navigation/androidBackToTabs";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

type ScheduleTab = "bookings" | "services";

function asScheduleTab(value: unknown): ScheduleTab | null {
  if (value === "bookings" || value === "services") {
    return value;
  }
  return null;
}

const TAB_CONFIG = [
  { key: "bookings" as const, label: "Bookings", icon: "calendar", color: "#30B0C7" },
  { key: "services" as const, label: "Services", icon: "layers", color: "#7B61FF" },
];

export default function AdminOpsScheduleScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams();

  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const canAccess = isAdminRole(apiUserRole) || appRole === "coach";
  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const incomingTab = asScheduleTab(params?.tab);
  const incomingAction =
    typeof params?.action === "string" ? params.action : undefined;

  const derivedInitialTab = useMemo<ScheduleTab>(() => {
    if (incomingAction === "createService") return "services";
    if (incomingTab) return incomingTab;
    return "bookings";
  }, [incomingAction, incomingTab]);

  const [tab, setTab] = useState<ScheduleTab>(derivedInitialTab);

  const servicesHook = useAdminServices(token, canLoad);

  useEffect(() => {
    setTab(derivedInitialTab);
  }, [derivedInitialTab]);

  useEffect(() => {
    if (!canLoad) return;
    servicesHook.loadServices(false);
  }, [canLoad]);

  const initialBookingAction =
    incomingAction === "createBooking" ? "createBooking" : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ThemedScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Header */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
          style={{ paddingTop: 20, paddingHorizontal: 24, marginBottom: 28 }}
        >
          <TouchableOpacity
            onPress={() => goBackOrFallbackTabs(router, pathname)}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
              alignItems: "center", justifyContent: "center",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              marginBottom: 20, alignSelf: "flex-start",
            }}
          >
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <View
              style={{
                width: 5,
                height: 36,
                borderRadius: 3,
                backgroundColor: "#30B0C7",
              }}
            />
            <View>
              <Text
                style={{
                  fontFamily: "Telma-Bold",
                  fontSize: 44,
                  color: colors.textPrimary,
                  letterSpacing: -1,
                  lineHeight: 48,
                }}
              >
                Schedule
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Manage services and client bookings.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Tab Switcher */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 28 }}
        >
          <View
            style={{
              flexDirection: "row",
              padding: 5,
              borderRadius: 24,
              borderWidth: 1,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
              gap: 4,
            }}
          >
            {TAB_CONFIG.map((t) => {
              const isActive = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    backgroundColor: isActive
                      ? isDark ? `${t.color}22` : `${t.color}16`
                      : "transparent",
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive
                      ? isDark ? `${t.color}35` : `${t.color}28`
                      : "transparent",
                  }}
                >
                  <Feather
                    name={t.icon as any}
                    size={16}
                    color={isActive ? t.color : colors.textSecondary}
                  />
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 13,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                      color: isActive ? t.color : colors.textSecondary,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(360).springify()}>
          {!canLoad ? (
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 60,
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={colors.accent} />
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginTop: 14,
                }}
              >
                Loading schedule tools...
              </Text>
            </View>
          ) : (
            <View>
              {tab === "bookings" && (
                <AdminBookingsSection
                  token={token}
                  canLoad={canLoad}
                  services={servicesHook.services}
                  initialAction={initialBookingAction}
                />
              )}
              {tab === "services" && (
                <AdminServicesSection token={token} canLoad={canLoad} />
              )}
            </View>
          )}
        </Animated.View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
