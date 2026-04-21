import { ATHLETE_TAB_ROUTES_WITH_TRACKING } from "../shared/tabs";

export const YOUTH_TAB_ROUTES = ATHLETE_TAB_ROUTES_WITH_TRACKING.filter(
  (tab) => tab.key !== "tracking",
);

