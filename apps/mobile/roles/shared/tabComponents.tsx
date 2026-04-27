import React from "react";

import HomeScreen from "@/app/(tabs)/index";
import MessagesScreen from "@/app/(tabs)/messages";
import MoreScreen from "@/app/(tabs)/more";
import ProgramsScreen from "@/app/(tabs)/programs";
import ScheduleScreen from "@/app/(tabs)/schedule";
import TrackingLayout from "@/app/(tabs)/tracking/_layout";
import ParentPlatformScreen from "@/app/parent-platform/index";

/**
 * Always mount the tracking Stack here. Toggling Stack vs index screen by pathname
 * caused navigator remount loops (max update depth) when the URL synced asynchronously.
 */
const TrackingWrapper = React.memo(() => <TrackingLayout />);

export const SHARED_TAB_COMPONENTS: Record<
  string,
  React.ComponentType<any>
> = {
  index: React.memo(HomeScreen),
  programs: React.memo(ProgramsScreen),
  messages: React.memo(MessagesScreen),
  schedule: React.memo(ScheduleScreen),
  tracking: TrackingWrapper,
  "parent-platform": React.memo(ParentPlatformScreen),
  more: React.memo(MoreScreen),
};
