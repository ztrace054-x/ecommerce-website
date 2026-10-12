import "server-only";
import { and, eq } from "drizzle-orm";
import { orders, products } from "../db/schema.ts";
import { createOrderSchema } from "./validators.ts";
import { getDatabase, type Database } from "./database/connection.ts";
import { DataAccessError } from "./database/errors.ts";
import { withUniqueOrderCode } from "./security/order-code.ts";

/** Internal database operation only. No HTTP/action calls it in Phase 2. */
export async function createPendingOrder(input: unknown, db?: Database) {
  const data = createOrderSchema.parse(input);
  try {
    const database = db ?? getDatabase();
    return await withUniqueOrderCode((orderCode) => database.transaction(async (tx) => {
      const [product] = await tx.select({ id: products.id, priceBdt: products.priceBdt })
        .from(products).where(and(eq(products.id, data.productId), eq(products.isActive, true)))
        .limit(1).for("share");
      if (!product) throw new DataAccessError("This product is not available.");
      const [order] = await tx.insert(orders).values({
        ...data, orderCode, amountExpected: product.priceBdt, status: "pending",
      }).returning({
        id: orders.id, orderCode: orders.orderCode,
        amountExpected: orders.amountExpected, status: orders.status,
      });
      if (!order) throw new DataAccessError();
      return order;
    }));
  } catch (error) {
    if (error instanceof DataAccessError) throw error;
    // Query exceptions include PII in their parameters. Do not propagate them.
    throw new DataAccessError("The order could not be saved.");
  }
}
