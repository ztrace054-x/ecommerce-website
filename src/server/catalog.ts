import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { products } from "../db/schema.ts";
import { idSchema } from "./validators.ts";
import { getDatabase, type Database } from "./database/connection.ts";
import { DataAccessError } from "./database/errors.ts";

// Explicit public projection: no connection data, private orders, or secrets.
const publicFields = {
  id: products.id, name: products.name, description: products.description,
  priceBdt: products.priceBdt, deliveryType: products.deliveryType,
};
export type CatalogProduct = Pick<typeof products.$inferSelect, keyof typeof publicFields>;

export async function listActiveProducts(db?: Database): Promise<CatalogProduct[]> {
  try {
    return await (db ?? getDatabase()).select(publicFields).from(products).where(eq(products.isActive, true))
      .orderBy(asc(products.createdAt), asc(products.id)).limit(100);
  } catch {
    throw new DataAccessError("The product catalog is unavailable.");
  }
}

export async function findActiveProduct(input: unknown, db?: Database): Promise<CatalogProduct | undefined> {
  const result = idSchema.safeParse(input);
  if (!result.success) return undefined;
  try {
    const [product] = await (db ?? getDatabase()).select(publicFields).from(products)
      .where(and(eq(products.id, result.data), eq(products.isActive, true))).limit(1);
    return product;
  } catch {
    throw new DataAccessError("The product catalog is unavailable.");
  }
}
