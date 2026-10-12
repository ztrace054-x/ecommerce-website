import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { products, orders, deliveryCodes, adminUsers, auditLogs } from "../src/db/schema.ts";
import { connectTestDatabase } from "./helpers/database.ts";
import { applyMigrations } from "../src/server/database/migrations.ts";
import { seedDemoProducts, demoProducts } from "../src/server/seed.ts";
import { listActiveProducts, findActiveProduct } from "../src/server/catalog.ts";
import { createPendingOrder } from "../src/server/orders.ts";
import { createAdminUser } from "../src/server/admin-provisioning.ts";
import { trxIdSchema } from "../src/server/validators.ts";
import { isDatabaseError } from "../src/server/database/errors.ts";
import { withUniqueOrderCode } from "../src/server/security/order-code.ts";
import { encrypt } from "../src/server/security/encryption.ts";
import { verifyPassword } from "../src/server/security/password.ts";

const { db, pool } = connectTestDatabase();
const productId = demoProducts[0]!.id;
const voucherProductId = demoProducts[3]!.id;
const customer = {
  productId, customerName: "Synthetic Student", customerEmail: "demo@example.com",
  senderBkashNumber: "01700000000",
};

async function clearFixtures() {
  await db.delete(auditLogs);
  await db.delete(deliveryCodes);
  await db.delete(orders);
  await db.delete(adminUsers);
  await db.delete(products);
}

before(async () => {
  await applyMigrations(db);
  await applyMigrations(db); // Re-running migrations must be harmless.
  await clearFixtures();
});
after(async () => { try { await clearFixtures(); } finally { await pool.end(); } });

test("fresh schema accepts an idempotent seed with A/B/C, no admins/vouchers/orders, and only active catalog rows", async () => {
  assert.equal(await seedDemoProducts(db), 4);
  assert.equal(await seedDemoProducts(db), 0);
  assert.deepEqual(new Set((await db.select().from(products)).map((row) => row.deliveryType)), new Set(["A", "B", "C"]));
  assert.equal((await db.select().from(adminUsers)).length, 0);
  assert.equal((await db.select().from(orders)).length, 0);
  assert.equal((await db.select().from(deliveryCodes)).length, 0);
  const active = await listActiveProducts(db);
  assert.equal(active.length, 2);
  assert.equal(await findActiveProduct(voucherProductId, db), undefined);
  assert.deepEqual(Object.keys(active[0]!).sort(), ["description", "deliveryType", "id", "name", "priceBdt"].sort());
});

test("pending order copies only the DB price, normalizes contacts and permits multiple null TrxIDs", async () => {
  const first = await createPendingOrder({ ...customer, customerEmail: " DEMO@EXAMPLE.COM ", whatsapp: "01700000000" }, db);
  const second = await createPendingOrder(customer, db);
  assert.equal(first.amountExpected, 500);
  assert.equal(first.status, "pending");
  assert.notEqual(first.orderCode, second.orderCode);
  const [stored] = await db.select().from(orders).where(eq(orders.id, first.id));
  assert.equal(stored!.trxId, null);
  assert.equal(stored!.submittedAt, null);
  assert.equal(stored!.customerEmail, "demo@example.com");
  assert.equal(stored!.whatsapp, "+8801700000000");
  await assert.rejects(createPendingOrder({ ...customer, amountExpected: 1 }, db), { name: "ZodError" });
  await assert.rejects(createPendingOrder({ ...customer, productId: voucherProductId }, db), /not available/u);
});

test("price changes affect new orders only; DB trigger ignores forged amounts and blocks quote edits", async () => {
  const earlier = await createPendingOrder(customer, db);
  await db.update(products).set({ priceBdt: 600 }).where(eq(products.id, productId));
  const later = await createPendingOrder(customer, db);
  assert.equal(earlier.amountExpected, 500);
  assert.equal(later.amountExpected, 600);
  const [inserted] = await db.insert(orders).values({ ...customer, orderCode: "ORD-ZZZZ2222", amountExpected: 1 }).returning();
  assert.equal(inserted!.amountExpected, 600);
  await assert.rejects(db.update(orders).set({ amountExpected: 1 }).where(eq(orders.id, later.id)), (error) => isDatabaseError(error, "23514", "orders_quote_immutable"));
  assert.equal(await seedDemoProducts(db), 0);
  assert.equal((await findActiveProduct(productId, db))!.priceBdt, 600);
  await db.update(products).set({ priceBdt: 500 }).where(eq(products.id, productId));
});

test("duplicate canonical TrxID is rejected by PostgreSQL, including concurrent submissions", async () => {
  const a = await createPendingOrder(customer, db);
  const b = await createPendingOrder(customer, db);
  const canonical = trxIdSchema.parse(" abc123de45 ");
  const results = await Promise.allSettled([a, b].map((order) =>
    db.update(orders).set({ trxId: canonical, status: "submitted", submittedAt: sql`now()` }).where(eq(orders.id, order.id))));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected?.status === "rejected");
  assert.equal(isDatabaseError(rejected.reason, "23505", "orders_trx_id_unique"), true);
});

test("direct DB writes cannot bypass TrxID uppercase/length/space checks or pending/submitted state constraints", async () => {
  const pending = await createPendingOrder(customer, db);
  for (const trxId of ["abc123de46", "ABC123DE4 ", "ABC-23DE46"]) {
    await assert.rejects(db.update(orders).set({ trxId, status: "submitted", submittedAt: sql`now()` }).where(eq(orders.id, pending.id)), (error) => isDatabaseError(error, "23514", "orders_trx_canonical"));
  }
  await assert.rejects(db.update(orders).set({ status: "verified" }).where(eq(orders.id, pending.id)), (error) => isDatabaseError(error, "23514"));
  await assert.rejects(db.update(orders).set({ status: "submitted" }).where(eq(orders.id, pending.id)), (error) => isDatabaseError(error, "23514", "orders_submission_state"));
  await assert.rejects(db.update(orders).set({ trxId: "ABC123DE46" }).where(eq(orders.id, pending.id)), (error) => isDatabaseError(error, "23514", "orders_submission_state"));
});

test("an assigned TrxID cannot be changed or released for reuse", async () => {
  const pending = await createPendingOrder(customer, db);
  await db.update(orders).set({ trxId: "ABC123DE47", status: "submitted", submittedAt: sql`now()` })
    .where(eq(orders.id, pending.id));
  for (const trxId of [null, "ABC123DE48"]) {
    await assert.rejects(db.update(orders).set({ trxId }).where(eq(orders.id, pending.id)),
      (error) => isDatabaseError(error, "23514", "orders_trx_immutable"));
  }
  assert.equal((await db.select().from(orders).where(eq(orders.id, pending.id)))[0]!.trxId, "ABC123DE47");
});

test("database order-code uniqueness causes a successful collision-safe retry", async () => {
  const existing = await createPendingOrder(customer, db);
  let count = 0;
  const inserted = await withUniqueOrderCode(async (orderCode) => {
    const [row] = await db.insert(orders).values({ ...customer, orderCode, amountExpected: 1 }).returning();
    return row!;
  }, () => ++count === 1 ? existing.orderCode : "ORD-ZZZZ3333");
  assert.equal(count, 2);
  assert.equal(inserted.orderCode, "ORD-ZZZZ3333");
});

test("foreign keys preserve orders and prevent a voucher assignment to a different product", async () => {
  const order = await createPendingOrder(customer, db);
  const original = process.env.ENCRYPTION_KEY;
  let codeEncrypted: string;
  const id = randomUUID();
  try {
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    codeEncrypted = encrypt("SYNTHETIC-NOT-REDEEMABLE", `delivery-code:${id}`);
  } finally {
    if (original === undefined) delete process.env.ENCRYPTION_KEY; else process.env.ENCRYPTION_KEY = original;
  }
  await assert.rejects(db.insert(deliveryCodes).values({ id, productId: voucherProductId, codeEncrypted, orderId: order.id, status: "used" }), (error) => isDatabaseError(error, "23503", "delivery_codes_order_product_fk"));
  await assert.rejects(db.delete(products).where(eq(products.id, productId)), (error) => isDatabaseError(error, "23503") || isDatabaseError(error, "23001"));
  await assert.rejects(db.insert(deliveryCodes).values({ productId: voucherProductId, codeEncrypted: "PLAINTEXT-NOT-ALLOWED" }), (error) => isDatabaseError(error, "23514", "delivery_codes_ciphertext_format"));
});

test("admin provisioning stores only a secure hash, requires later 2FA, and never overwrites duplicate email", async () => {
  const synthetic = "SYNTHETIC-admin-fixture-only";
  const created = await createAdminUser({ email: " ADMIN@EXAMPLE.COM ", password: synthetic }, db);
  const [stored] = await db.select().from(adminUsers).where(eq(adminUsers.id, created.id));
  assert.equal(stored!.email, "admin@example.com");
  assert.equal(stored!.totpSecretEncrypted, null);
  assert.equal(stored!.failedLoginCount, 0);
  assert.equal(stored!.lockedUntil, null);
  assert.equal(await verifyPassword(synthetic, stored!.passwordHash), true);
  await assert.rejects(createAdminUser({ email: "admin@example.com", password: "SYNTHETIC-new-fixture-only" }, db), /already exists/u);
  assert.equal((await db.select().from(adminUsers).where(eq(adminUsers.id, created.id)))[0]!.passwordHash, stored!.passwordHash);
});

test("RLS is enabled without public policies on all five tables", async () => {
  const result = await db.execute<{ relname: string; relrowsecurity: boolean }>(sql`
    SELECT relname, relrowsecurity FROM pg_catalog.pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname IN ('products', 'orders', 'delivery_codes', 'admin_users', 'audit_logs')`);
  assert.equal(result.rows.length, 5);
  assert.ok(result.rows.every((row) => row.relrowsecurity));
  const policies = await db.execute(sql`SELECT policyname FROM pg_catalog.pg_policies WHERE schemaname = 'public'`);
  assert.equal(policies.rows.length, 0);
});

test("even a role with table grants cannot read or insert public rows through RLS", async () => {
  // Transaction rollback removes this temporary test role and its grants.
  await assert.rejects(db.transaction(async (tx) => {
    await tx.execute(sql`CREATE ROLE phase2_untrusted NOLOGIN NOSUPERUSER NOBYPASSRLS`);
    await tx.execute(sql`GRANT USAGE ON SCHEMA public TO phase2_untrusted`);
    await tx.execute(sql`GRANT SELECT, INSERT ON products, orders, delivery_codes, admin_users, audit_logs TO phase2_untrusted`);
    await tx.execute(sql`SET LOCAL ROLE phase2_untrusted`);
    assert.equal((await tx.select().from(products)).length, 0);
    assert.equal((await tx.select().from(orders)).length, 0);
    await tx.insert(products).values({ ...demoProducts[0]!, id: randomUUID() });
  }), (error) => isDatabaseError(error, "42501"));
});
