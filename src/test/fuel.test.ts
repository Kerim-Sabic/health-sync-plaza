import { describe, expect, it } from "vitest";
import { clampWater, copyFood, recentFoods, FUEL_TARGET } from "@/lib/fuel";
import type { FoodLog } from "@/lib/types";
const food: FoodLog = {
  id: "original",
  user_id: "owner",
  name: "Oats",
  meal: "Breakfast",
  log_date: "2026-10-13",
  calories: 400,
  protein: 20,
  carbs: 60,
  fat: 10,
};
describe("Fuel data preservation", () => {
  it("copies nutrition exactly to a selected date without reusing ownership or identity", () => {
    const before = { ...food };
    expect(copyFood(food, "2026-10-14")).toEqual({
      name: "Oats",
      meal: "Breakfast",
      log_date: "2026-10-14",
      calories: 400,
      protein: 20,
      carbs: 60,
      fat: 10,
    });
    expect(food).toEqual(before);
  });
  it("suggests unique historical foods, excluding today and future days", () => {
    expect(
      recentFoods(
        [
          food,
          { ...food, id: "repeat" },
          { ...food, id: "today", name: "Rice", log_date: "2026-10-14" },
        ],
        "2026-10-14",
      ).map((f) => f.id),
    ).toEqual(["original"]);
  });
  it("preserves existing daily nutrition targets", () => {
    expect(FUEL_TARGET).toEqual({ calories: 2300, protein: 140, carbs: 250, fat: 75 });
  });
  it("limits water to eight whole 250 ml glasses", () => {
    expect([clampWater(9), clampWater(-1), clampWater(NaN), clampWater(2.7)]).toEqual([8, 0, 0, 2]);
  });
});
