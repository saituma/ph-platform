import { BASE_TEAM_TAB_ROUTES, PARENT_PLATFORM_TAB, TRACKING_TAB } from "../shared/tabs";

export const TEAM_TAB_ROUTES = [
  ...BASE_TEAM_TAB_ROUTES.slice(0, 4),
  TRACKING_TAB,
  ...BASE_TEAM_TAB_ROUTES.slice(4),
];

export const TEAM_YOUTH_TAB_ROUTES = [
  ...BASE_TEAM_TAB_ROUTES.slice(0, 4),
  PARENT_PLATFORM_TAB,
  ...BASE_TEAM_TAB_ROUTES.slice(4),
];
