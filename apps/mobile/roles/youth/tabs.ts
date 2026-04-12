import { BASE_TEAM_TAB_ROUTES } from "../shared/tabs";

export const YOUTH_TAB_ROUTES = BASE_TEAM_TAB_ROUTES.filter(
  (tab) => tab.key !== "tracking",
);

