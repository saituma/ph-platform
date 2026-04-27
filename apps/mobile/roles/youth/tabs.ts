import { BASE_TEAM_TAB_ROUTES, PARENT_PLATFORM_TAB } from "../shared/tabs";

export const YOUTH_TAB_ROUTES = [
  ...BASE_TEAM_TAB_ROUTES.slice(0, 4),
  PARENT_PLATFORM_TAB,
  ...BASE_TEAM_TAB_ROUTES.slice(4),
];
