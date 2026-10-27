import "server-only";
import { sql } from "drizzle-orm";
import { connectDatabase } from "../../db/client.ts";
import type { OrderInput } from "./validation.ts";
import { createTrackingStore } from "./tracking-store.ts";
import { generateOrderCode } from "./security.ts";

export class OrderConflict extends Error {}
export class ProductUnavailable extends Error {}
export function createOrderStore(url: string, nextCode = generateOrderCode) {
  const connection = connectDatabase(url);
  const db = connection.db;
  return {
    close: connection.close,
    tracking: createTrackingStore(db),
    async rateLimit(ipHash: string, limits = { short: 5, day: 20 }): Promise<number> {
      return db.transaction(async tx => {
        // Serialize all replicas for this identity, including concurrent cold starts.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${ipHash}, 0))`);
        await tx.execute(sql`DELETE FROM order_rate_events WHERE ip_hash = ${ipHash} AND created_at < now() - interval '1 day'`);
        const rows = await tx.execute(sql`
          SELECT count(*) FILTER (WHERE created_at > now() - interval '10 minutes')::int AS short_count,
            count(*)::int AS day_count,
            ceil(extract(epoch FROM (min(created_at) FILTER (WHERE created_at > now() - interval '10 minutes') + interval '10 minutes' - now())))::int AS short_retry,
            ceil(extract(epoch FROM (min(created_at) + interval '1 day' - now())))::int AS day_retry
          FROM order_rate_events WHERE ip_hash = ${ipHash}`);
        const row = rows[0]!;
        const retry = Math.max(Number(row.short_count) >= limits.short ? Number(row.short_retry) : 0, Number(row.day_count) >= limits.day ? Number(row.day_retry) : 0);
        if (retry > 0) return retry;
        await tx.execute(sql`INSERT INTO order_rate_events (ip_hash) VALUES (${ipHash})`);
        return 0;
      });
    },
    async create(input: OrderInput, ipHash: string) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = nextCode();
        try {
          return await db.transaction(async tx => {
            // Lock product until insertion; price and active status cannot race an edit.
            const products = await tx.execute(sql`SELECT price_bdt FROM products WHERE id = ${input.productId} AND is_active = true FOR SHARE`);
            if (!products.length) throw new ProductUnavailable();
            const amount = Number(products[0]!.price_bdt);
            const rows = await tx.execute(sql`INSERT INTO orders
              (order_code, product_id, customer_name, customer_email, whatsapp, sender_bkash_number, trx_id, amount_expected, status, client_ip_hash)
              VALUES (${code}, ${input.productId}, ${input.customerName}, ${input.customerEmail}, ${input.whatsapp ?? null}, ${input.senderBkashNumber}, ${input.trxId}, ${amount}, 'submitted', ${ipHash}) RETURNING id`);
            await tx.execute(sql`INSERT INTO audit_logs (action, order_id, order_code, ip_hash) VALUES ('order.submitted', ${rows[0]!.id}, ${code}, ${ipHash})`);
            return { orderCode: code, amountExpected: amount, status: "submitted" as const };
          });
        } catch (error) {
          // Drizzle may wrap the driver's error; never send driver details to clients.
          const outer = error as { cause?: unknown };
          const dbError = (outer.cause ?? error) as { code?: string; constraint_name?: string };
          if (dbError.code === "23505" && dbError.constraint_name === "orders_trx_id_unique") throw new OrderConflict();
          if (dbError.code === "23505" && dbError.constraint_name === "orders_order_code_unique") continue;
          throw error;
        }
      }
      throw new Error("Order code allocation failed.");
    },
    async productBySlug(slug: string) {
      const rows = await db.execute(sql`SELECT id, name, price_bdt FROM products WHERE slug = ${slug} AND is_active = true`);
      const row = rows[0];
      return row ? { id: String(row.id), name: String(row.name), priceBdt: Number(row.price_bdt) } : null;
    },
  };
}
export type OrderStore = ReturnType<typeof createOrderStore>;
