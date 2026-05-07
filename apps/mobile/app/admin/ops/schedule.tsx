import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminBookingsSection } from "@/components/admin/AdminBookingsSection";
import { AdminServicesSection } from "@/components/admin/AdminServicesSection";
import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminSegmentedTabs,
  AdminLoadingState,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import { useAdminServices } from "@/hooks/admin/useAdminServices";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter, usePathname } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { isAdminRole } from "@/lib/isAdminRole";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Calendar, Layers } from "lucide-react-native";

type ScheduleTab = "bookings" | "services";

function asScheduleTab(value: unknown): ScheduleTab | null {
  if (value === "bookings" || value === "services") {
    return value;
  }
  return null;
}

export default function AdminOpsScheduleScreen() {
  const pastel = useAdminPastel();
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams();

  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const canAccess = isAdminRole(apiUserRole) || appRole === "coach";
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
  const initialServiceAction =
    incomingAction === "createService" ? "createService" : null;

  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  return (
    <AdminScreen>
      <ThemedScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Header */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
        >
          <AdminHeader
            title="Schedule"
            subtitle="Manage services and client bookings"
            right={<AdminBackButton onPress={() => router.back()} />}
          />
        </Animated.View>

        {/* Tab Switcher */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 28 }}
        >
          <AdminSegmentedTabs
            tabs={[
              { key: "bookings", label: "Bookings", icon: Calendar },
              { key: "services", label: "Services", icon: Layers },
            ]}
            value={tab}
            onChange={setTab}
          />
        </Animated.View>

        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(360).springify()}>
          {!canLoad ? (
            <AdminLoadingState label="Loading schedule tools..." />
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
                <AdminServicesSection
                  token={token}
                  canLoad={canLoad}
                  initialAction={initialServiceAction}
                />
              )}
            </View>
          )}
        </Animated.View>
      </ThemedScrollView>
    </AdminScreen>
  );
}
