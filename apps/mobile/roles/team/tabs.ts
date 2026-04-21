import { BASE_TEAM_TAB_ROUTES } from "../shared/tabs";
import type { TabConfig } from "@/components/navigation";

const TRACKING_TAB = {
  key: "tracking",
  label: "Tracking",
  icon: "walk",
  iconOutline: "walk-outline",
} as const satisfies TabConfig;

export const TEAM_TAB_ROUTES: TabConfig[] = [
  ...BASE_TEAM_TAB_ROUTES.slice(0, 4),
  TRACKING_TAB,
  ...BASE_TEAM_TAB_ROUTES.slice(4),
];

