import { microsoftProducts } from "./products-microsoft";
import { adobeProducts } from "./products-adobe";
import { autodeskProducts } from "./products-autodesk";
import { zohoProducts } from "./products-zoho";
import { otherProducts } from "./products-other";
import type { ProductSeed } from "./types";

export const products: ProductSeed[] = [
  ...microsoftProducts,
  ...adobeProducts,
  ...autodeskProducts,
  ...zohoProducts,
  ...otherProducts,
];
