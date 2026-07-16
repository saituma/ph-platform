export type MealSlotName = "breakfast" | "lunch" | "snack" | "dinner";

export type MealItem = {
  id: string;
  name: string;
  calories: number;
  weightGrams: number;
  unit: string;
  /** Macros in grams. Optional so older logs (calories-only) still parse. */
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type MealSlotData = {
  slot: MealSlotName;
  label: string;
  items: MealItem[];
  /** Public CDN URLs of food photos attached to this meal. */
  photos: string[];
  recommendedMin: number;
  recommendedMax: number;
};

export type DailyNutrition = {
  dateKey: string;
  targetCalories: number;
  eatenCalories: number;
  burnedCalories: number;
  meals: Record<MealSlotName, MealSlotData>;
  /** Per-macro: `eaten` summed from logged foods, `target` from coach-set goals (0 = unset). */
  macros: {
    carbs: { eaten: number; target: number };
    protein: { eaten: number; target: number };
    fats: { eaten: number; target: number };
  };
  /** True when a coach has set any macro target — drives the "no goals set" empty state. */
  hasMacroTargets: boolean;
};
