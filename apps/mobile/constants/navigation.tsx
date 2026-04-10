import type { TabConfig } from "@/components/navigation";
import type React from "react";

import { ADMIN_TAB_ROUTES } from "@/app/_roles/admin/tabs";
import { ADMIN_TAB_COMPONENTS } from "@/app/_roles/admin/tabComponents";
import { SHARED_TAB_COMPONENTS as BASE_SHARED_TAB_COMPONENTS } from "@/app/_roles/shared/tabComponents";
import { BASE_TEAM_TAB_ROUTES } from "@/app/_roles/shared/tabs";

export const TEAM_MODE_TAB_ROUTES: TabConfig[] = BASE_TEAM_TAB_ROUTES;
export const DEFAULT_TAB_ROUTES = TEAM_MODE_TAB_ROUTES;

export const SHARED_TAB_COMPONENTS: Record<
  string,
  React.ComponentType<any>
> = {
  ...BASE_SHARED_TAB_COMPONENTS,
  ...ADMIN_TAB_COMPONENTS,
};

export { ADMIN_TAB_ROUTES };
