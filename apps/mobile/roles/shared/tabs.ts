import { TabConfig } from "@/components/navigation";

/** Home first so the main shell opens on Home (index 0), not Programs. */
export const BASE_TEAM_TAB_ROUTES: TabConfig[] = [
  { key: "index", label: "Home", icon: "home", iconOutline: "home-outline" },
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
  {
    key: "schedule",
    label: "Schedule",
    icon: "calendar",
    iconOutline: "calendar-outline",
  },
  { key: "more", label: "More", icon: "menu", iconOutline: "menu-outline" },
];

export const TRACKING_TAB: TabConfig = {
  key: "tracking",
  label: "Tracking",
  icon: "walk",
  iconOutline: "walk-outline",
};

export const PARENT_PLATFORM_TAB: TabConfig = {
  key: "parent-platform",
  label: "Parents",
  icon: "book",
  iconOutline: "book-outline",
};

/**
 * Home, Programs, Messages, Schedule, Tracking, More — used for team + adult athlete shells.
 * (Youth shell omits Tracking — see `roles/youth/tabs.ts`.)
 */
export const ATHLETE_TAB_ROUTES_WITH_TRACKING: TabConfig[] = [
  ...BASE_TEAM_TAB_ROUTES.slice(0, 4),
  TRACKING_TAB,
  ...BASE_TEAM_TAB_ROUTES.slice(4),
];
