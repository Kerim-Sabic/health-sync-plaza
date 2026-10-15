import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseBarcodeProduct } from "./barcode";

export const lookupFoodBarcode = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ barcode: z.string().regex(/^\d{8,14}$/, "Enter an 8–14 digit food barcode.") })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${data.barcode}.json?fields=product_name,brands,nutriments`,
      {
        headers: { "User-Agent": "Kinra/1.0 (health-sync-plaza.lovable.app; food logging)" },
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok)
      throw new Error(
        "Food lookup is unavailable right now. Try again or enter the food manually.",
      );
    return parseBarcodeProduct(await response.json());
  });
