import { describe, expect, it } from "vitest";
import { barcodePortion, parseBarcodeProduct } from "@/lib/barcode";

describe("food barcode labels", () => {
  const product = {
    status: 1,
    product: {
      product_name: "Oats",
      brands: "Example",
      nutriments: {
        "energy-kcal_100g": 370,
        proteins_100g: 12,
        carbohydrates_100g: 60,
        fat_100g: 7,
      },
    },
  };
  it("reads a complete label and scales the reviewed portion", () => {
    const food = parseBarcodeProduct(product);
    expect(food?.name).toBe("Oats");
    if (!food) throw new Error("Missing label");
    expect(barcodePortion(food, 50)).toEqual({
      name: "Oats",
      calories: 185,
      protein: 6,
      carbs: 30,
      fat: 3.5,
    });
    expect(food.calories).toBe(370);
  });
  it("does not invent zero macros for incomplete or unknown foods", () => {
    expect(parseBarcodeProduct({ status: 0 })).toBeNull();
    expect(
      parseBarcodeProduct({
        status: 1,
        product: { product_name: "Oats", nutriments: { proteins_100g: 12 } },
      }),
    ).toBeNull();
  });
});
