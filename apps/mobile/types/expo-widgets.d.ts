import type { ComponentType } from "react";

declare module "expo-widgets" {
  export type WidgetTask = (props: Record<string, unknown>) => Promise<Record<string, unknown>>;

  export function registerWidget(
    name: string,
    component: ComponentType<object>,
    task: WidgetTask,
  ): void;
}
