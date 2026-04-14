import React from "react";
import { useSafePathname } from "@/hooks/navigation/useSafeExpoRouter";

import HomeScreen from "@/app/(tabs)/index";
import MessagesScreen from "@/app/(tabs)/messages";
import MoreScreen from "@/app/(tabs)/more";
import ProgramsScreen from "@/app/(tabs)/programs";
import ScheduleScreen from "@/app/(tabs)/schedule";
import TrackingHomeScreen from "@/app/(tabs)/tracking/index";
import TrackingLayout from "@/app/(tabs)/tracking/_layout";

const TrackingWrapper = React.memo(() => {
  const pathname = useSafePathname("");
  const isTrackingRoute =
    !!pathname &&
    (pathname.startsWith("/(tabs)/tracking") || pathname.startsWith("/tracking"));
  return isTrackingRoute ? <TrackingLayout /> : <TrackingHomeScreen />;
});

export const SHARED_TAB_COMPONENTS: Record<
  string,
  React.ComponentType<any>
> = {
  index: React.memo(HomeScreen),
  programs: React.memo(ProgramsScreen),
  messages: React.memo(MessagesScreen),
  schedule: React.memo(ScheduleScreen),
  tracking: TrackingWrapper,
  more: React.memo(MoreScreen),
};
