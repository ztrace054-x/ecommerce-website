import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { before, after } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { products, paymentClaims } from "../src/db/schema.ts";
import { migrateMarketplace, seedMarketplaceAdmin, seedMarketplaceProduct } from "./helpers/marketplace-database.ts";
import { createOrderCode, createToken, hashToken, randomUUID } from "../src/lib/security/crypto.ts";

const db = new PGlite();
const product = randomUUID();
const actor = randomUUID();
const provider = randomUUID();
before(async () => {
  await migrateMarketplace(db);
  await seedMarketplaceProduct(db, product);
  await seedMarketplaceAdmin(db, actor, provider);
});
after(async () => { await db.close(); });

async function call<T = unknown>(name: string, args: unknown[]): Promise<T> {
  assert.match(name, /^ai_[a-z_]+$/);
  const placeholders = args.map((_, i) => `$${i + 1}`).join(",");
  return (await db.query<{ value: T }>(`SELECT public.${name}(${placeholders}) AS value`, args)).rows[0]!.value;
}
async function claim() {
  const code = createOrderCode();
  const tokenHash = hashToken(createToken());
  await call("ai_create_quote", [randomUUID(), code, tokenHash, product, "01700000000", "payment"]);
  await call("ai_submit_order", [tokenHash, "Synthetic Customer", "test@example.com", "01700000000", "", createToken().slice(0, 10).toUpperCase(), createToken()]);
  return (await db.query<{ id: string }>("SELECT id FROM public.orders WHERE order_code=$1", [code])).rows[0]!.id;
}
type Claim = { order_id: string; trx_id: string; verification_status: string; reviewed_by: string | null; reviewed_at: Date | null; review_audit_id: string | null };
async function paymentClaim(id: string) {
  return (await db.query<Claim>("SELECT * FROM public.payment_claims WHERE order_id=$1", [id])).rows[0]!;
}

test("Drizzle typed queries match the fresh product columns and private claim view", async () => {
  const database = drizzle(db);
  const [stored] = await database.select().from(products);
  assert.equal(stored!.currency, "BDT");
  assert.equal(stored!.category, "সেবা");
  const id = await claim();
  const claims = await database.select().from(paymentClaims);
  const storedClaim = claims.find((c) => c.orderId === id)!;
  assert.equal(storedClaim.verificationStatus, "submitted");
  assert.equal(storedClaim.reviewedBy, null);
});

test("populated upgrade preserves every old field and does not invent claim reviewers", async () => {
  const legacy = new PGlite();
  try {
    await legacy.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;");
    for (const name of ["0000_phase_2_schema", "0001_order_price_guards", "0002_marketplace"]) {
      await legacy.exec(readFileSync(new URL(`../src/db/migrations/${name}.sql`, import.meta.url), "utf8"));
    }
    const legacyProduct = randomUUID();
    const legacyActor = randomUUID();
    await seedMarketplaceProduct(legacy, legacyProduct);
    await seedMarketplaceAdmin(legacy, legacyActor, randomUUID(), false);
    await legacy.query("UPDATE public.products SET storefront_metadata=$1 WHERE id=$2", [{ category: "Original category" }, legacyProduct]);
    const states = ["pending", "submitted", "verified", "delivered", "rejected", "refunded"];
    for (const [index, status] of states.entries()) {
      await legacy.query(`INSERT INTO public.orders(order_code,product_id,customer_name,customer_email,sender_bkash_number,amount_expected,status,trx_id,submitted_at,verified_at,delivered_at)
        VALUES($1,$2,'Legacy Customer','legacy@example.com','01700000000',1,$3::text::public.order_status,$4,
          CASE WHEN $3='pending' THEN NULL ELSE now() END,
          CASE WHEN $3 IN ('verified','delivered','refunded') THEN now() ELSE NULL END,
          CASE WHEN $3='delivered' THEN now() ELSE NULL END)`,
      [createOrderCode(), legacyProduct, status, status === "pending" ? null : `LEGACY000${index}`]);
    }
    const beforeRows = (await legacy.query<Record<string, unknown>>("SELECT * FROM public.orders ORDER BY id")).rows;
    await legacy.exec(readFileSync(new URL("../src/db/migrations/0003_phase_2_foundation.sql", import.meta.url), "utf8"));
    const afterRows = (await legacy.query<Record<string, unknown>>("SELECT * FROM public.orders ORDER BY id")).rows;
    const paymentStates: Record<string, string> = { pending: "unpaid", submitted: "submitted", verified: "verified", delivered: "verified", rejected: "rejected", refunded: "refunded" };
    for (const [i, row] of afterRows.entries()) {
      assert.deepEqual(Object.fromEntries(Object.entries(row).filter(([key]) => key !== "currency" && key !== "payment_status")), beforeRows[i]);
      assert.equal(row.amount_expected, 500);
      assert.equal(row.currency, "BDT");
      assert.equal(row.payment_status, paymentStates[String(row.status)]);
    }
    const claims = (await legacy.query<Claim>("SELECT * FROM public.payment_claims")).rows;
    assert.equal(claims.length, 5);
    assert.ok(claims.every((c) => c.reviewed_by === null && c.review_audit_id === null));
    assert.deepEqual((await legacy.query("SELECT category,currency FROM public.products")).rows[0], { category: "Original category", currency: "BDT" });
    assert.deepEqual((await legacy.query("SELECT role,is_active FROM public.admin_users")).rows[0], { role: "admin", is_active: false });
    for (const role of ["anon", "authenticated"]) {
      assert.equal((await legacy.query<{ allowed: boolean }>("SELECT has_table_privilege($1,'public.payment_claims','SELECT') allowed", [role])).rows[0]!.allowed, false);
    }
  } finally { await legacy.close(); }
});

test("claim review references the atomic audit, and delivery keeps payment verified", async () => {
  const id = await claim();
  const initial = await paymentClaim(id);
  assert.equal(initial.verification_status, "submitted");
  assert.equal(initial.reviewed_by, null);
  await call("ai_admin_update_order", [actor, id, "verified", 1, "Synthetic receipt checked", "", 50000]);
  const verified = await paymentClaim(id);
  assert.equal(verified.verification_status, "verified");
  assert.equal(verified.reviewed_by, actor);
  assert.ok(verified.review_audit_id && verified.reviewed_at);
  const audit = (await db.query<{ action: string; order_id: string }>("SELECT action,order_id FROM public.audit_logs WHERE id=$1", [verified.review_audit_id])).rows[0]!;
  assert.equal(audit.action, "order.verified");
  assert.equal(audit.order_id, id);
  await call("ai_admin_update_order", [actor, id, "delivered", 2, "Synthetic delivery", "Completed", null]);
  assert.deepEqual(await paymentClaim(id), verified);
  const rejected = await claim();
  await call("ai_admin_update_order", [actor, rejected, "rejected", 1, "Synthetic rejection", "Receipt does not match", null]);
  assert.equal((await paymentClaim(rejected)).verification_status, "rejected");
  assert.equal((await paymentClaim(rejected)).reviewed_by, actor);
});

test("a failed audit rolls back both payment state and visible verification record", async () => {
  const id = await claim();
  await db.exec("CREATE FUNCTION public.foundation_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic_audit_failure'; END $$; CREATE TRIGGER foundation_audit_failure BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.foundation_audit_failure();");
  try {
    await assert.rejects(() => call("ai_admin_update_order", [actor, id, "verified", 1, "Synthetic receipt", "", 50000]), /synthetic_audit_failure/);
    assert.equal((await paymentClaim(id)).verification_status, "submitted");
    assert.equal((await paymentClaim(id)).reviewed_by, null);
  } finally {
    await db.exec("DROP TRIGGER foundation_audit_failure ON public.audit_logs; DROP FUNCTION public.foundation_audit_failure();");
  }
});

test("currency is BDT-only and generated payment/category values cannot be forged", async () => {
  const id = await claim();
  await assert.rejects(() => db.query("UPDATE public.orders SET currency='USD' WHERE id=$1", [id]), /orders_currency_bdt/);
  await assert.rejects(() => db.query("UPDATE public.products SET currency='USD' WHERE id=$1", [product]), /products_currency_bdt/);
  await assert.rejects(() => db.query("UPDATE public.orders SET payment_status='verified' WHERE id=$1", [id]), { code: "428C9" });
  await assert.rejects(() => db.query("UPDATE public.products SET category='Fake' WHERE id=$1", [product]), { code: "428C9" });
  await db.query("UPDATE public.products SET storefront_metadata=$1 WHERE id=$2", [{ category: "Updated category" }, product]);
  assert.equal((await db.query<{ category: string }>("SELECT category FROM public.products WHERE id=$1", [product])).rows[0]!.category, "Updated category");
});

test("private claim view denies public grants, respects underlying RLS and is read-only for runtime", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    try { await assert.rejects(() => db.query("SELECT * FROM public.payment_claims"), /permission denied/); }
    finally { await db.exec("RESET ROLE"); }
  }
  // Prove security_invoker still enforces default-deny RLS if SELECT is accidentally granted.
  await db.exec("GRANT SELECT ON public.payment_claims,public.orders,public.audit_logs TO authenticated; SET ROLE authenticated;");
  try { assert.equal((await db.query("SELECT * FROM public.payment_claims")).rows.length, 0); }
  finally { await db.exec("RESET ROLE; REVOKE SELECT ON public.payment_claims,public.orders,public.audit_logs FROM authenticated;"); }
  await db.exec("SET ROLE service_role");
  try {
    assert.ok((await db.query("SELECT * FROM public.payment_claims")).rows.length > 0);
    for (const privilege of ["INSERT", "UPDATE", "DELETE"]) {
      assert.equal((await db.query<{ allowed: boolean }>("SELECT has_table_privilege('service_role','public.payment_claims',$1) allowed", [privilege])).rows[0]!.allowed, false);
    }
  } finally { await db.exec("RESET ROLE"); }
});

test("reserved support role cannot log in or use admin RPCs; changing role invalidates existing sessions", async () => {
  const support = randomUUID();
  const supportProvider = randomUUID();
  await seedMarketplaceAdmin(db, support, supportProvider);
  const token = hashToken(createToken());
  const expires = new Date(Date.now() + 60000).toISOString();
  await call("ai_open_admin_session", [supportProvider, token, expires]);
  assert.ok(await call("ai_get_admin_session", [token]));
  await db.query("UPDATE public.admin_users SET role='support' WHERE id=$1", [support]);
  assert.equal(await call("ai_get_admin_session", [token]), null);
  await assert.rejects(() => call("ai_open_admin_session", [supportProvider, hashToken(createToken()), expires]), /forbidden/);
  await assert.rejects(() => call("ai_admin_products", [support]), /forbidden/);
  await assert.rejects(() => call("ai_admin_audit", [support, 1]), /forbidden/);
  const id = await claim();
  await assert.rejects(() => call("ai_admin_update_order", [support, id, "verified", 1, "Forbidden", "", 50000]), /forbidden/);
  assert.equal((await paymentClaim(id)).verification_status, "submitted");
  await assert.rejects(() => db.query("UPDATE public.admin_users SET role='owner' WHERE id=$1", [support]), /admin_users_role_valid/);
  await db.exec("SET ROLE authenticated");
  try {
    await assert.rejects(() => call("ai_require_admin", [actor]), /permission denied/);
    await assert.rejects(() => call("ai_open_admin_session", [provider, hashToken(createToken()), expires]), /permission denied/);
    await assert.rejects(() => call("ai_get_admin_session", [token]), /permission denied/);
  } finally { await db.exec("RESET ROLE"); }
});
