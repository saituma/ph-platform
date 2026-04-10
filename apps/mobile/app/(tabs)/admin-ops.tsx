import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { subscribeToAdminOpsRequests } from "@/context/AdminOpsContext";
import { useAppSelector } from "@/store/hooks";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
      >
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-4xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Ops
              </Text>
              <Text
                className="text-[12px] font-outfit text-secondary"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2 mb-4">
          {(["bookings", "availability", "teams", "services"] as OpsSection[]).map((s) => (
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
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {!canLoad ? (
            <Text selectable className="text-sm font-outfit text-secondary">
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
      </ThemedScrollView>
    </View>
  );
}
