import React from "react";

import HomeScreen from "@/app/(tabs)/index";
import MessagesScreen from "@/app/(tabs)/messages";
import MoreScreen from "@/app/(tabs)/more";
import ProgramsScreen from "@/app/(tabs)/programs";
import ScheduleScreen from "@/app/(tabs)/schedule";
import TrackingHomeScreen from "@/app/(tabs)/tracking";
import ParentPlatformScreen from "@/app/parent-platform/index";

export const SHARED_TAB_COMPONENTS: Record<
  string,
  React.ComponentType<any>
> = {
  index: React.memo(HomeScreen),
  programs: React.memo(ProgramsScreen),
  messages: React.memo(MessagesScreen),
  schedule: React.memo(ScheduleScreen),
  tracking: React.memo(TrackingHomeScreen),
  "parent-platform": React.memo(ParentPlatformScreen),
  more: React.memo(MoreScreen),
};
