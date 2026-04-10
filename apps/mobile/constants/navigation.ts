import { TabConfig } from "@/components/navigation";
import React from "react";
import { usePathname } from "expo-router";

import HomeScreen from "@/app/(tabs)/index";
import MessagesScreen from "@/app/(tabs)/messages";
import MoreScreen from "@/app/(tabs)/more";
import ProgramsScreen from "@/app/(tabs)/programs";
import ScheduleScreen from "@/app/(tabs)/schedule";
import TrackingHomeScreen from "@/app/(tabs)/tracking/index";
import TrackingLayout from "@/app/(tabs)/tracking/_layout";

import CoachHome from "@/components/roles/coach/Home";
import CoachVideos from "@/components/roles/coach/Videos";
import CoachUsers from "@/components/roles/coach/Users";
import CoachMessages from "@/components/roles/coach/Messages";
import CoachContent from "@/components/roles/coach/Content";
import CoachOps from "@/components/roles/coach/Ops";
import CoachProfile from "@/components/roles/coach/Profile";

export const TEAM_MODE_TAB_ROUTES: TabConfig[] = [
  {
    key: "programs",
    label: "Programs",
    icon: "pulse",
    iconOutline: "pulse-outline",
  },
  {
    key: "messages",
    label: "Messages",
    icon: "chatbox-ellipses",
    iconOutline: "chatbox-ellipses-outline",
  },
  { key: "index", label: "Home", icon: "home", iconOutline: "home-outline" },
  {
    key: "schedule",
    label: "Schedule",
    icon: "calendar",
    iconOutline: "calendar-outline",
  },
  {
    key: "tracking",
    label: "Tracking",
    icon: "walk",
    iconOutline: "walk-outline",
  },
  { key: "more", label: "More", icon: "menu", iconOutline: "menu-outline" },
];

export const ADMIN_TAB_ROUTES: TabConfig[] = [
  {
    key: "admin-home",
    label: "Admin",
    icon: "shield",
    iconOutline: "shield-outline",
  },
  {
    key: "admin-videos",
    label: "Videos",
    icon: "videocam",
    iconOutline: "videocam-outline",
  },
  {
    key: "admin-users",
    label: "Users",
    icon: "people",
    iconOutline: "people-outline",
  },
  {
    key: "admin-messages",
    label: "Messages",
    icon: "chatbox-ellipses",
    iconOutline: "chatbox-ellipses-outline",
  },
  {
    key: "admin-content",
    label: "Content",
    icon: "library",
    iconOutline: "library-outline",
  },
  {
    key: "admin-ops",
    label: "Ops",
    icon: "settings",
    iconOutline: "settings-outline",
  },
  {
    key: "admin-profile",
    label: "Profile",
    icon: "person",
    iconOutline: "person-outline",
  },
];

export const DEFAULT_TAB_ROUTES = TEAM_MODE_TAB_ROUTES;

const TrackingWrapper = React.memo(() => {
  const pathname = usePathname();
  const isTrackingRoute =
    pathname.startsWith("/(tabs)/tracking") ||
    pathname.startsWith("/tracking");
  return isTrackingRoute ? <TrackingLayout /> : <TrackingHomeScreen />;
});

export const SHARED_TAB_COMPONENTS: Record<string, React.ComponentType<any>> = {
  index: React.memo(HomeScreen),
  programs: React.memo(ProgramsScreen),
  messages: React.memo(MessagesScreen),
  schedule: React.memo(ScheduleScreen),
  tracking: TrackingWrapper,
  more: React.memo(MoreScreen),
  "admin-home": React.memo(CoachHome),
  "admin-videos": React.memo(CoachVideos),
  "admin-users": React.memo(CoachUsers),
  "admin-messages": React.memo(CoachMessages),
  "admin-content": React.memo(CoachContent),
  "admin-ops": React.memo(CoachOps),
  "admin-profile": React.memo(CoachProfile),
};
