import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminAvailabilitySection } from "@/components/admin/AdminAvailabilitySection";
import { AdminBookingsSection } from "@/components/admin/AdminBookingsSection";
import { AdminServicesSection } from "@/components/admin/AdminServicesSection";
import { useAdminServices } from "@/hooks/admin/useAdminServices";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@/components/ui/theme-icons";

type ScheduleTab = "bookings" | "services";

function asScheduleTab(value: unknown): ScheduleTab | null {
  if (value === "bookings" || value === "services") {
    return value;
  }
  return null;
}

export default function AdminOpsScheduleScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

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
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Header */}
        <View className="pt-10 mb-8 px-6">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <Text className="text-5xl font-telma-bold text-app tracking-tight">
              Schedule
            </Text>
          </View>
          <Text className="text-base font-outfit text-textSecondary leading-relaxed">
            Manage services and client bookings.
          </Text>
        </View>

        {/* Custom Tab Switcher (Shadcn style) */}
        <View className="px-6 mb-10">
          <View 
            className="flex-row p-1.5 rounded-[26px] border"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            {(["bookings", "services"] as const).map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => setTab(key)}
                className="flex-1 h-14 rounded-[20px] items-center justify-center"
                style={{
                  backgroundColor: tab === key ? colors.accent : "transparent",
                }}
              >
                <Text 
                  className="font-outfit-bold text-[13px] uppercase tracking-wider"
                  style={{ color: tab === key ? colors.textInverse : colors.textSecondary }}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          {!canLoad ? (
            <View className="px-6 py-20 items-center">
              <ActivityIndicator color={colors.accent} />
              <Text className="text-sm font-outfit text-textSecondary mt-4">
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
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
