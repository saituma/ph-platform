export type MealSlotName = "breakfast" | "lunch" | "snack" | "dinner";

export type MealItem = {
  id: string;
  name: string;
  calories: number;
  weightGrams: number;
  unit: string;
};

export type MealSlotData = {
  slot: MealSlotName;
  label: string;
  items: MealItem[];
  recommendedMin: number;
  recommendedMax: number;
};

export type DailyNutrition = {
  dateKey: string;
  targetCalories: number;
  eatenCalories: number;
  burnedCalories: number;
  meals: Record<MealSlotName, MealSlotData>;
  macros: {
    carbs: { grams: number };
    protein: { grams: number };
    fats: { grams: number };
  };
};
