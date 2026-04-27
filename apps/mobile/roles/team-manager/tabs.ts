import type { TabConfig } from "@/components/navigation";

export const TEAM_MANAGER_TAB_ROUTES: TabConfig[] = [
  { key: "manager-home", label: "Team", icon: "people", iconOutline: "people-outline" },
  { key: "manager-manage", label: "Roster", icon: "clipboard", iconOutline: "clipboard-outline" },
  { key: "messages", label: "Chat", icon: "chatbubbles", iconOutline: "chatbubbles-outline" },
  { key: "schedule", label: "Schedule", icon: "calendar", iconOutline: "calendar-outline" },
  { key: "tracking", label: "Stats", icon: "analytics", iconOutline: "analytics-outline" },
  { key: "manager-profile", label: "Profile", icon: "person", iconOutline: "person-outline" },
];
