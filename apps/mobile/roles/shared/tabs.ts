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
