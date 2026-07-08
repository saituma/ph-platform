import type { TabConfig } from "@/components/navigation";
import { BASE_TEAM_TAB_ROUTES, NEWS_TAB, TRACKING_TAB } from "../shared/tabs";

/** Same tab strip as team/youth athletes — includes Tracking (runs / GPS) and News. */
export const ADULT_TAB_ROUTES: TabConfig[] = [
  ...BASE_TEAM_TAB_ROUTES.slice(0, 4),
  TRACKING_TAB,
  NEWS_TAB,
  ...BASE_TEAM_TAB_ROUTES.slice(4),
];
