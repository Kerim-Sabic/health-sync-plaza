export interface BarcodeFood {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export function parseBarcodeProduct(value: unknown): BarcodeFood | null {
  if (!value || typeof value !== "object") return null;
  const response = value as {
    status?: number;
    product?: { product_name?: string; brands?: string; nutriments?: Record<string, unknown> };
  };
  const product = response.product;
  if (response.status !== 1 || !product?.product_name || !product.nutriments) return null;
  const n = product.nutriments;
  const number = (key: string) => {
    const v = n[key];
    return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  };
  const calories =
    number("energy-kcal_100g") ??
    (number("energy_100g") != null ? Number(n["energy_100g"]) / 4.184 : null);
  const protein = number("proteins_100g"),
    carbs = number("carbohydrates_100g"),
    fat = number("fat_100g");
  if (calories == null || protein == null || carbs == null || fat == null) return null;
  return { name: product.product_name, brand: product.brands ?? "", calories, protein, carbs, fat };
}
export function barcodePortion(food: BarcodeFood, grams: number) {
  const ratio = grams / 100;
  const round = (n: number) => Math.round(n * ratio * 10) / 10;
  return {
    name: food.name,
    calories: Math.round(food.calories * ratio),
    protein: round(food.protein),
    carbs: round(food.carbs),
    fat: round(food.fat),
  };
}
