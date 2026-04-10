import React from "react";

import { AppRole } from "@/lib/appRole";

import { NutritionPanel } from "./NutritionPanel";

type FoodDiaryPanelProps = {
  appRole: AppRole | null;
};

export function FoodDiaryPanel({ appRole }: FoodDiaryPanelProps) {
  return <NutritionPanel appRole={appRole} />;
}
