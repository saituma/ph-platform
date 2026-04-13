import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminAvailabilitySection } from "@/components/admin/AdminAvailabilitySection";
import { AdminBookingsSection } from "@/components/admin/AdminBookingsSection";
import { AdminServicesSection } from "@/components/admin/AdminServicesSection";
import { Chip } from "@/components/admin/AdminShared";
import { AdminCard } from "@/roles/admin/components/AdminCard";
import { useAdminServices } from "@/hooks/admin/useAdminServices";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScheduleTab = "bookings" | "services" | "availability";

function asScheduleTab(value: unknown): ScheduleTab | null {
  if (value === "bookings" || value === "services" || value === "availability") {
    return value;
  }
  return null;
}

export default function AdminOpsScheduleScreen() {
  const { colors } = useAppTheme();
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
    if (incomingAction === "createAvailability") return "availability";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad]);

  const initialBookingAction =
    incomingAction === "createBooking" ? "createBooking" : null;

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="pt-10 mb-6 px-6">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <Text className="text-5xl font-telma-bold text-app tracking-tight">
              Schedule
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Bookings, service types, and availability — matching the web schedule tooling.
          </Text>
        </View>

        <View className="mb-5">
          <View className="flex-row px-6 gap-3">
            {(
              [
                { key: "bookings", label: "Bookings" },
                { key: "services", label: "Services" },
                { key: "availability", label: "Availability" },
              ] as const
            ).map((item) => (
              <View key={item.key} className="flex-1">
                <Chip
                  label={item.label}
                  selected={tab === item.key}
                  onPress={() => setTab(item.key)}
                />
              </View>
            ))}
          </View>
        </View>

        <View className="px-6">
          {!canLoad ? (
            <AdminCard>
              <Text className="text-sm font-outfit text-secondary text-center py-4">
                Admin tools will load after auth bootstrap.
              </Text>
            </AdminCard>
          ) : (
            <AdminCard>
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
              {tab === "availability" && (
                <AdminAvailabilitySection
                  token={token}
                  canLoad={canLoad}
                  services={servicesHook.services}
                />
              )}
            </AdminCard>
          )}
        </View>

        <View className="px-6 mt-6">
          <Text className="text-[12px] font-outfit text-secondary text-center">
            Need team rosters?{" "}
            <Text
              className="text-[12px] font-outfit-bold font-bold"
              style={{ color: colors.accent }}
              onPress={() => router.push("/admin-teams")}
            >
              Open Teams
            </Text>
          </Text>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
