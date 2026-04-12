import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { subscribeToAdminOpsRequests } from "@/context/AdminOpsContext";
import { useAppSelector } from "@/store/hooks";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { OpsSection } from "@/types/admin";
import { useAdminServices } from "@/hooks/admin/useAdminServices";
import { Chip } from "@/components/admin/AdminShared";
import { AdminBookingsSection } from "@/components/admin/AdminBookingsSection";
import { AdminAvailabilitySection } from "@/components/admin/AdminAvailabilitySection";
import { AdminServicesSection } from "@/components/admin/AdminServicesSection";
import { AdminTeamsSection } from "@/components/admin/AdminTeamsSection";

export default function AdminOpsScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const [section, setSection] = useState<OpsSection>("bookings");
  const [initialAction, setInitialAction] = useState<"createBooking" | null>(null);

  const canLoad = Boolean(token && bootstrapReady);
  const servicesHook = useAdminServices(token, canLoad);

  useEffect(() => {
    return subscribeToAdminOpsRequests((payload) => {
      if (payload.section) setSection(payload.section);
      if (payload.action === "createBooking") {
        setSection("bookings");
        setInitialAction("createBooking");
      }
      if (payload.action === "createAvailability") {
        setSection("availability");
      }
      if (payload.action === "createService") {
        setSection("services");
      }
    });
  }, []);

  useEffect(() => {
    if (canLoad && (section === "bookings" || section === "availability" || section === "services")) {
      servicesHook.loadServices(false);
    }
  }, [canLoad, section]);

  const subtitle = useMemo(() => {
    if (section === "bookings") return "Bookings management";
    if (section === "availability") return "Availability blocks";
    if (section === "teams") return "Teams & Rosters";
    return "Service types";
  }, [section]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={() => {
          if (section === "services") return servicesHook.loadServices(true);
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
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
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        <View className="mb-6">
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
          >
            {(
              ["bookings", "availability", "teams", "services"] as OpsSection[]
            ).map((s) => (
              <Chip
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                selected={section === s}
                onPress={() => {
                  setSection(s);
                  setInitialAction(null);
                }}
              />
            ))}
          </Animated.ScrollView>
        </View>

        <View className="px-6">
          <View
            className="rounded-[32px] border p-6"
            style={{
              backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            {!canLoad ? (
              <Text selectable className="text-sm font-outfit text-secondary text-center py-8">
                Admin tools will load after auth bootstrap.
              </Text>
            ) : (
              <>
                {section === "bookings" && (
                  <AdminBookingsSection
                    token={token}
                    canLoad={canLoad}
                    services={servicesHook.services}
                    initialAction={initialAction}
                  />
                )}
                {section === "availability" && (
                  <AdminAvailabilitySection
                    token={token}
                    canLoad={canLoad}
                    services={servicesHook.services}
                  />
                )}
                {section === "services" && (
                  <AdminServicesSection token={token} canLoad={canLoad} />
                )}
                {section === "teams" && <AdminTeamsSection />}
              </>
            )}
          </View>
        </View>
      </ThemedScrollView>
    </View>
  );
}
