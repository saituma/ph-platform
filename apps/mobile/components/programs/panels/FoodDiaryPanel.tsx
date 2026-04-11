import React from "react";

import { AppRole } from "@/lib/appRole";
import { useAppSelector } from "@/store/hooks";

import { NutritionPanel } from "./NutritionPanel";

type FoodDiaryPanelProps = {
  appRole?: AppRole | null;
};

export function FoodDiaryPanel({ appRole }: FoodDiaryPanelProps) {
  const storeRole = useAppSelector((state) => state.user.appRole);
  return <NutritionPanel appRole={appRole ?? storeRole} />;
}
