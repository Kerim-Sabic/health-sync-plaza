import type { FoodLog } from "@/lib/types";

export const FUEL_TARGET = { calories: 2300, protein: 140, carbs: 250, fat: 75 };
export const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export type FoodDraft = Pick<
  FoodLog,
  "meal" | "name" | "calories" | "protein" | "carbs" | "fat" | "log_date"
>;

export function copyFood(food: FoodLog, date: string): FoodDraft {
  return {
    meal: food.meal,
    name: food.name,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    log_date: date,
  };
}

export function recentFoods(food: FoodLog[], date: string) {
  const seen = new Set<string>();
  return [...food]
    .filter((f) => f.log_date < date)
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
    .filter((f) => {
      const key = `${f.name.toLowerCase()}|${f.calories}|${f.protein}|${f.carbs}|${f.fat}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

export function clampWater(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(8, Math.floor(value))) : 0;
}
