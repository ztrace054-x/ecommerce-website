import "server-only";
import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { orderCodeSchema, last4Schema } from "./tracking-validation.ts";
import { statusMessages, type TrackingView } from "./tracking-view.ts";

type Executor = Pick<PostgresJsDatabase, "execute">;
export function createTrackingStore(db: PostgresJsDatabase) {
  async function lookupOrder(orderCode: string, last4: string, executor: Executor = db): Promise<TrackingView | null> {
    const code = orderCodeSchema.parse(orderCode);
    const suffix = last4Schema.parse(last4);
    const rows = await executor.execute(sql`SELECT o.order_code, o.status, p.name AS product_name,
      o.amount_expected, o.created_at, o.delivery_channel, o.delivery_sent_to, right(o.sender_bkash_number, 4) AS suffix
      FROM orders o JOIN products p ON p.id = o.product_id WHERE o.order_code = ${code}`);
    const row = rows[0];
    // Same fixed-size comparison for both missing orders and mismatched credentials.
    const expected = String(row?.suffix ?? "0000");
    const match = timingSafeEqual(Buffer.from(suffix), Buffer.from(expected.padEnd(4, "0").slice(-4)));
    if (!row || !match) return null;
    const status = String(row.status) as keyof typeof statusMessages;
    if (!Object.hasOwn(statusMessages, status)) throw new Error("Unsupported status.");
    const destination=String(row.delivery_sent_to??'');
    const masked=String(row.delivery_channel)==='email'&&destination.includes('@')?destination.replace(/^(.).+(@.*)$/, '$1•••$2'):String(row.delivery_channel)==='whatsapp'&&destination.length>=4?`••••${destination.slice(-4)}`:null;
    return { orderCode: String(row.order_code), status, productName: String(row.product_name), amountExpected: Number(row.amount_expected), createdAt: new Date(String(row.created_at)).toISOString(), ...(status==='delivered'?{deliveryDestination:masked}:{}), message: statusMessages[status] };
  }
  async function audit(codeHash: string | null, ipHash: string, result: string, executor: Executor = db) {
    await executor.execute(sql`INSERT INTO audit_logs (action, order_code, ip_hash) VALUES (${`track.${result}`}, ${codeHash}, ${ipHash})`);
  }
  async function retryAfter(codeHash: string) {
    const rows = await db.execute(sql`SELECT greatest(0, ceil(extract(epoch FROM (locked_until - clock_timestamp()))))::int AS retry FROM tracking_code_limits WHERE code_hash = ${codeHash}`);
    return Number(rows[0]?.retry ?? 0);
  }
  async function attempt(orderCode: string, last4: string, codeHash: string, ipHash: string) {
    return db.transaction(async tx => {
      await tx.execute(sql`INSERT INTO tracking_code_limits (code_hash) VALUES (${codeHash}) ON CONFLICT DO NOTHING`);
      // Serialize check, comparison, failure accounting and audit across all IPs/replicas.
      const rows = await tx.execute(sql`SELECT failures, window_started, locked_until FROM tracking_code_limits WHERE code_hash = ${codeHash} FOR UPDATE`);
      const clocks = await tx.execute(sql`SELECT clock_timestamp() AS current_time`);
      const now = new Date(String(clocks[0]!.current_time)).getTime();
      const row = rows[0]!;
      const lockEnd = row.locked_until ? new Date(String(row.locked_until)).getTime() : 0;
      if (lockEnd > now) { await audit(codeHash, ipHash, "locked", tx); return { retryAfter: Math.ceil((lockEnd - now) / 1000), view: null }; }
      const expired = lockEnd > 0 || now - new Date(String(row.window_started)).getTime() >= 900000;
      if (expired) await tx.execute(sql`UPDATE tracking_code_limits SET failures = 0, locked_until = NULL, window_started = clock_timestamp() WHERE code_hash = ${codeHash}`);
      const view = await lookupOrder(orderCode, last4, tx);
      if (!view) {
        const failures = (expired ? 0 : Number(row.failures)) + 1;
        await tx.execute(sql`UPDATE tracking_code_limits SET failures = ${failures}, locked_until = CASE WHEN ${failures} >= 5 THEN clock_timestamp() + interval '15 minutes' ELSE NULL END WHERE code_hash = ${codeHash}`);
      }
      await audit(codeHash, ipHash, view ? "found" : "not_found", tx);
      return { retryAfter: 0, view };
    });
  }
  return { lookupOrder, audit, retryAfter, attempt };
}
