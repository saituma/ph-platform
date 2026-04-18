import { TabConfig } from "@/components/navigation";

export const BASE_TEAM_TAB_ROUTES: TabConfig[] = [
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
  { key: "more", label: "More", icon: "menu", iconOutline: "menu-outline" },
];
