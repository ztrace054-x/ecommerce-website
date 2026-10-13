import assert from "node:assert/strict";
import { migrateMarketplace, seedMarketplaceAdmin, seedMarketplaceProduct } from "./helpers/marketplace-database.ts";
import test, { before, after } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  createOrderCode,
  createToken,
  hashToken,
  randomUUID,
} from "../src/lib/security/crypto.ts";
const db = new PGlite();
const actor = randomUUID();
const providerActor = randomUUID();
const inactiveActor = randomUUID();
const inactiveProviderActor = randomUUID();
const productId = randomUUID();
before(async () => {
  await migrateMarketplace(db);
  await seedMarketplaceAdmin(db, actor, providerActor);
  await seedMarketplaceAdmin(db, inactiveActor, inactiveProviderActor, false);
  await seedMarketplaceProduct(db, productId);
});
after(async () => {
  await db.close();
});
async function call<T = Record<string, unknown>>(
  name: string,
  args: unknown[],
): Promise<T> {
  const placeholders = args.map((_, i) => "$" + (i + 1)).join(",");
  const data = await db.query<{ value: T }>(
    "SELECT public." + name + "(" + placeholders + ") AS value",
    args,
  );
  return data.rows[0]!.value;
}
async function quote() {
  const token = createToken();
  const code = createOrderCode();
  await call("ai_create_quote", [
    randomUUID(),
    code,
    hashToken(token),
    productId,
    "01700000000",
    "payment",
  ]);
  return { token, code };
}
async function submit(
  q: { token: string },
  trx = createToken().slice(0, 10).toUpperCase(),
  fingerprint = createToken(),
) {
  return call<{ orderCode: string; status: string }>("ai_submit_order", [
    hashToken(q.token),
    "Synthetic Customer",
    "demo@example.com",
    "01700000000",
    "",
    trx,
    fingerprint,
  ]);
}
async function orderFor(code: string) {
  const rows = await db.query<{
    id: string;
    version: number;
    amount_poisha: number;
    status: string;
  }>(
    "SELECT id,version,(amount_expected*100) AS amount_poisha,status FROM public.orders WHERE order_code=$1",
    [code],
  );
  return rows.rows[0]!;
}
test("database quotes snapshot authoritative prices before any customer record exists", async () => {
  const q = await quote();
  await db.query(
    "UPDATE public.products SET price_bdt=750 WHERE id=$1",
    [productId],
  );
  await submit(q);
  const order = await orderFor(q.code);
  assert.equal(order.amount_poisha, 50000);
  assert.equal(order.status, "submitted");
  await db.query(
    "UPDATE public.products SET price_bdt=500 WHERE id=$1",
    [productId],
  );
});
test("same claim is idempotent, conflicting retries fail and duplicate TrxIDs cannot create two orders", async () => {
  const q = await quote();
  const trx = "SYNTHETIC1";
  const fingerprint = createToken();
  await submit(q, trx, fingerprint);
  await submit(q, trx, fingerprint);
  assert.equal(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int n FROM public.orders WHERE order_code=$1",
        [q.code],
      )
    ).rows[0]!.n,
    1,
  );
  await assert.rejects(() => submit(q, trx, createToken()), /claim_conflict/);
  const [one, two] = await Promise.all([quote(), quote()]);
  const race = await Promise.allSettled([
    submit(one, "RACETRX001"),
    submit(two, "RACETRX001"),
  ]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(race.filter((r) => r.status === "rejected").length, 1);
  assert.equal(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int n FROM public.orders WHERE trx_id='RACETRX001'",
      )
    ).rows[0]!.n,
    1,
  );
});
test("expired quotes fail; unpublished products block new quotes but honor issued quotes", async () => {
  const q = await quote();
  await db.query(
    "UPDATE public.ai_checkout_sessions SET expires_at=now()-interval '1 second' WHERE order_code=$1",
    [q.code],
  );
  await assert.rejects(() => submit(q), /quote_expired/);
  const second = await quote();
  await db.query("UPDATE public.products SET is_active=false WHERE id=$1", [
    productId,
  ]);
  await assert.rejects(() => quote(), /product_unavailable/);
  await submit(second);
  await db.query("UPDATE public.products SET is_active=true WHERE id=$1", [
    productId,
  ]);
});
test("tracking requires all credentials and exposes no contact, transaction, token hash or admin notes", async () => {
  const q = await quote();
  await submit(q);
  const order = await orderFor(q.code);
  await call("ai_admin_add_note", [actor, order.id, "PRIVATE INTERNAL NOTE"]);
  assert.equal(
    await call("ai_track_order", [
      q.code,
      "wrong@example.com",
      hashToken(q.token),
    ]),
    null,
  );
  assert.equal(
    await call("ai_track_order", [
      q.code,
      "demo@example.com",
      hashToken(createToken()),
    ]),
    null,
  );
  const publicData = await call<Record<string, unknown>>("ai_track_order", [
    q.code,
    "demo@example.com",
    hashToken(q.token),
  ]);
  assert.equal(publicData.status, "submitted");
  for (const field of [
    "customerEmail",
    "customerName",
    "trxId",
    "bkashSender",
    "trackingTokenHash",
    "notes",
    "id",
  ])
    assert.equal(field in publicData, false);
  assert.ok(!JSON.stringify(publicData).includes("PRIVATE INTERNAL"));
});
test("manual verification enforces amount, actor, optimistic version and state transitions", async () => {
  const q = await quote();
  await submit(q);
  const o = await orderFor(q.code);
  await assert.rejects(
    () =>
      call("ai_admin_update_order", [
        actor,
        o.id,
        "delivered",
        1,
        "note",
        "",
        null,
      ]),
    /invalid_transition/,
  );
  await assert.rejects(
    () =>
      call("ai_admin_update_order", [
        actor,
        o.id,
        "verified",
        1,
        "note",
        "",
        1,
      ]),
    /amount_mismatch/,
  );
  await assert.rejects(
    () =>
      call("ai_admin_update_order", [
        inactiveActor,
        o.id,
        "verified",
        1,
        "note",
        "",
        50000,
      ]),
    /forbidden/,
  );
  await call("ai_admin_update_order", [
    actor,
    o.id,
    "verified",
    1,
    "Checked synthetic payment",
    "",
    50000,
  ]);
  await assert.rejects(
    () =>
      call("ai_admin_update_order", [
        actor,
        o.id,
        "delivered",
        1,
        "note",
        "",
        null,
      ]),
    /stale_order/,
  );
  await call("ai_admin_update_order", [
    actor,
    o.id,
    "delivered",
    2,
    "Synthetic delivery complete",
    "Delivered by email",
    null,
  ]);
  await assert.rejects(
    () =>
      call("ai_admin_update_order", [
        actor,
        o.id,
        "delivered",
        3,
        "note",
        "",
        null,
      ]),
    /invalid_transition/,
  );
  const details = await call<{
    order: { status: string };
    notes: unknown[];
    audit: unknown[];
  }>("ai_admin_order_detail", [actor, o.id]);
  assert.equal(details.order.status, "delivered");
  assert.equal(details.notes.length, 2);
  assert.equal(details.audit.length, 3);
});
test("status, note and audit updates roll back together when audit insertion fails", async () => {
  const q = await quote();
  await submit(q);
  const o = await orderFor(q.code);
  await db.exec(
    "CREATE FUNCTION public.test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='order.verified' THEN RAISE EXCEPTION 'synthetic_audit_failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_audit_failure BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.test_audit_failure();",
  );
  try {
    await assert.rejects(
      () =>
        call("ai_admin_update_order", [
          actor,
          o.id,
          "verified",
          1,
          "note",
          "",
          50000,
        ]),
      /synthetic_audit_failure/,
    );
    assert.equal((await orderFor(q.code)).status, "submitted");
    assert.equal(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int n FROM public.ai_order_notes WHERE order_id=$1",
          [o.id],
        )
      ).rows[0]!.n,
      0,
    );
  } finally {
    await db.exec(
      "DROP TRIGGER test_audit_failure ON public.audit_logs; DROP FUNCTION public.test_audit_failure();",
    );
  }
});
test("rate limits use atomic database counters", async () => {
  const key = createToken();
  const attempts = await Promise.all(
    Array.from({ length: 10 }, () =>
      call<boolean>("ai_take_rate_limit", [key, 3, 86400]),
    ),
  );
  assert.equal(attempts.filter(Boolean).length, 3);
  assert.equal(attempts.filter((v) => !v).length, 7);
});
test("admin sessions deny disabled accounts and revoked or expired sessions", async () => {
  const token = createToken();
  await call("ai_open_admin_session", [
    providerActor,
    hashToken(token),
    new Date(Date.now() + 60000).toISOString(),
  ]);
  assert.equal(
    (await call<{ id: string }>("ai_get_admin_session", [hashToken(token)])).id,
    actor,
  );
  await call("ai_close_admin_session", [hashToken(token)]);
  assert.equal(await call("ai_get_admin_session", [hashToken(token)]), null);
  await assert.rejects(
    () =>
      call("ai_open_admin_session", [
        inactiveProviderActor,
        hashToken(createToken()),
        new Date(Date.now() + 60000).toISOString(),
      ]),
    /forbidden/,
  );
});
test("admin search, product management, overview and paginated audit functions work", async () => {
  const list = await call<{ orders: unknown[]; total: number }>(
    "ai_admin_list_orders",
    [actor, "Synthetic", "submitted", 1],
  );
  assert.ok(list.total > 0);
  assert.ok(list.orders.length > 0);
  const none = await call<{ total: number }>("ai_admin_list_orders", [
    actor,
    "' OR 1=1 --",
    null,
    1,
  ]);
  assert.equal(none.total, 0);
  const p = {
    slug: "new-synthetic-service",
    name: "New synthetic service",
    category: "Test",
    description: "Synthetic only description",
    pricePoisha: 12300,
    unit: "Session",
    duration: "Agreed duration",
    icon: "prompt",
    includes: ["Test feature"],
    deliveryType: "service",
    deliveryMethod: "Email",
    deliveryNote: "Synthetic only",
    terms: "Synthetic terms only",
    active: false,
  };
  const created = await call<{ id: string; active: boolean }>(
    "ai_admin_save_product",
    [actor, null, JSON.stringify(p)],
  );
  assert.equal(created.active, false);
  await call("ai_admin_save_product", [
    actor,
    created.id,
    JSON.stringify({ ...p, pricePoisha: 22200 }),
  ]);
  assert.ok((await call<unknown[]>("ai_admin_products", [actor])).length >= 2);
  assert.ok(
    (await call<{ total: number }>("ai_admin_overview", [actor])).total > 0,
  );
  assert.ok(
    (await call<{ events: unknown[] }>("ai_admin_audit", [actor, 1])).events
      .length > 0,
  );
});
test("anonymous and ordinary authenticated database roles have no tables or RPC access", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec("SET ROLE " + role);
    try {
      await assert.rejects(
        () => db.query("SELECT * FROM public.orders"),
        /permission denied/,
      );
      await assert.rejects(
        () =>
          call("ai_track_order", [
            createOrderCode(),
            "demo@example.com",
            hashToken(createToken()),
          ]),
        /permission denied/,
      );
    } finally {
      await db.exec("RESET ROLE");
    }
  }
  const grants = await db.query<{ allowed: boolean }>(
    "SELECT has_table_privilege('service_role','public.audit_logs','UPDATE') allowed",
  );
  assert.equal(grants.rows[0]!.allowed, false);
});
test("database-level constraints reject negative prices and immutable order identities", async () => {
  await assert.rejects(
    () =>
      db.query("UPDATE public.products SET price_bdt=-1 WHERE id=$1", [
        productId,
      ]),
    /check constraint/,
  );
  await assert.rejects(
    () => db.query("UPDATE public.orders SET product_id=$1", [randomUUID()]),
    /Order quote is immutable/,
  );
});

test("the additive migration preserves populated Phase 2 data, money, price guards and append-only grants", async () => {
  const legacy = new PGlite();
  const { readFileSync } = await import("node:fs");
  try {
    await legacy.exec("CREATE ROLE service_role BYPASSRLS;");
    for (const name of ["0000_phase_2_schema", "0001_order_price_guards"]) {
      await legacy.exec(readFileSync(new URL(`../src/db/migrations/${name}.sql`, import.meta.url), "utf8"));
    }
    const product = randomUUID();
    const administrator = randomUUID();
    await legacy.query("INSERT INTO public.products(id,name,description,price_bdt,delivery_type,is_active) VALUES($1,'Legacy service','Original record',500,'C',true)", [product]);
    await legacy.query("INSERT INTO public.admin_users(id,email,password_hash) VALUES($1,'legacy@example.com',$2)", [administrator, "scrypt-v1$131072$8$1$" + "a".repeat(43) + "$" + "b".repeat(86)]);
    const original = await legacy.query<{ id: string }>("INSERT INTO public.orders(order_code,product_id,customer_name,customer_email,sender_bkash_number,trx_id,amount_expected,status,submitted_at,admin_note) VALUES('ORD-HJKMN234',$1,'Legacy Customer','legacy@example.com','01700000000','LEGACY0001',1,'submitted',now(),'Legacy private note') RETURNING id", [product]);
    await legacy.query("INSERT INTO public.audit_logs(admin_id,action,order_id,ip) VALUES($1,'order.submitted',$2,'203.0.113.5')", [administrator, original.rows[0]!.id]);
    await legacy.exec("GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;");
    await legacy.exec(readFileSync(new URL("../src/db/migrations/0002_marketplace.sql", import.meta.url), "utf8"));
    const retained = (await legacy.query<{ amount_expected: number; trx_id: string; admin_note: string; tracking_token_hash: null }>("SELECT * FROM public.orders WHERE order_code='ORD-HJKMN234'")).rows[0]!;
    assert.equal(retained.amount_expected, 500);
    assert.equal(retained.trx_id, "LEGACY0001");
    assert.equal(retained.admin_note, "Legacy private note");
    assert.equal(retained.tracking_token_hash, null);
    assert.equal((await legacy.query<{ ip: string }>("SELECT ip::text FROM public.audit_logs")).rows[0]!.ip, "203.0.113.5/32");
    await assert.rejects(() => legacy.query("UPDATE public.orders SET amount_expected=1"), /Order quote is immutable/);
    await assert.rejects(() => legacy.query("UPDATE public.orders SET trx_id='CHANGED001'"), /transaction ID is immutable/);
    const grants = (await legacy.query<{ update_allowed: boolean; delete_allowed: boolean }>("SELECT has_table_privilege('service_role','public.audit_logs','UPDATE') update_allowed, has_table_privilege('service_role','public.audit_logs','DELETE') delete_allowed")).rows[0]!;
    assert.equal(grants.update_allowed, false);
    assert.equal(grants.delete_allowed, false);
  } finally { await legacy.close(); }
});
