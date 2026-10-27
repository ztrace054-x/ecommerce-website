import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { createOrderStore } from "../src/lib/orders/store.ts";
import { createOrderHandler, verifyTurnstile } from "../src/lib/orders/handler.ts";
import { normalizeBdPhone, normalizeTrxId, generateOrderCode, ORDER_ALPHABET, hashIp, getClientIp, TRX_ID_PATTERN } from "../src/lib/orders/security.ts";
import { orderSchema } from "../src/lib/orders/validation.ts";
import { loadOrderEnv, type OrderEnv } from "../src/lib/env/orders.ts";
import { GET, PUT, PATCH, DELETE, HEAD, OPTIONS } from "../src/app/api/orders/route.ts";

const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:55432/ecommerce_test";
const dbUrl = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(dbUrl.hostname) || !dbUrl.pathname.endsWith("_test")) throw new Error("Tests require an isolated loopback database ending in _test.");
const config: OrderEnv = {
  DATABASE_URL: databaseUrl, IP_HASH_SECRET: "synthetic-test-ip-hmac-secret-32-characters",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  SITE_ORIGIN: "http://localhost:3000", ALLOWED_ORIGINS: ["http://localhost:3000"], TRUSTED_PROXY_MODE: "local", ADMIN_WHATSAPP_NUMBER: "8801700000000", BKASH_RECIPIENT_NUMBER: "01700000000",
};
const input = { productId: "00000000-0000-4000-8000-000000000001", customerName: "Demo Student", customerEmail: "DEMO@example.com", senderBkashNumber: "+8801700000000", trxId: "ab cd 1234", turnstileToken: "synthetic-token" };
function request(body: unknown = input, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/orders", { method: "POST", headers: { Origin: config.ALLOWED_ORIGINS[0]!, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}

test("normalizers, cryptographic order codes, hashing and proxy trust", () => {
  assert.equal(normalizeTrxId(" ab cd1234 \n"), "ABCD1234");
  assert.ok(TRX_ID_PATTERN.test(normalizeTrxId(" ab cd1234 ")));
  for (const v of ["01700000000", "8801700000000", "+8801700000000"]) assert.equal(normalizeBdPhone(v), "01700000000");
  for (const v of ["01200000000", "017000", "01<script>", "01700000000 OR 1=1"]) assert.throws(() => normalizeBdPhone(v));
  const codes = new Set(Array.from({ length: 1000 }, generateOrderCode));
  assert.equal(codes.size, 1000);
  for (const code of codes) { assert.match(code, /^ORD-.{8}$/); for (const c of code.slice(4)) assert.ok(ORDER_ALPHABET.includes(c)); }
  assert.equal(hashIp("127.0.0.1", config.IP_HASH_SECRET), hashIp("127.0.0.1", config.IP_HASH_SECRET));
  assert.notEqual(hashIp("127.0.0.1", config.IP_HASH_SECRET), hashIp("127.0.0.1", config.IP_HASH_SECRET + "x"));
  assert.throws(() => hashIp("127.0.0.1", ""));
  assert.throws(() => getClientIp(new Request("https://example.com", { headers: { "cf-connecting-ip": "1.2.3.4" } }), "vercel"));
  assert.equal(getClientIp(new Request("https://example.com", { headers: { "x-forwarded-for": "1.2.3.4" } }), "vercel"), "1.2.3.4");
  assert.throws(() => getClientIp(new Request("https://example.com", { headers: { "x-forwarded-for": "1.2.3.4, 2.3.4.5" } }), "vercel"));
});

test("environment fails closed without leaking supplied values", () => {
  const original = process.env.IP_HASH_SECRET;
  try { process.env.IP_HASH_SECRET = "sensitive-synthetic-value"; assert.throws(loadOrderEnv, { message: "Order service configuration is missing or invalid." }); }
  finally { if (original === undefined) delete process.env.IP_HASH_SECRET; else process.env.IP_HASH_SECRET = original; }
});

test("wrong HTTP methods return 405 with Allow", async () => {
  for (const handler of [GET, PUT, PATCH, DELETE, HEAD, OPTIONS]) { const r = handler(); assert.equal(r.status, 405); assert.equal(r.headers.get("allow"), "POST"); }
});

test("Turnstile fails closed on unsuccessful or wrong-host/action verification", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const body of [{ success: false }, { success: true, hostname: "evil.example", action: "order" }, { success: true, hostname: "localhost", action: "other" }]) {
      globalThis.fetch = async () => Response.json(body);
      assert.equal(await verifyTurnstile("test", { ...config, TURNSTILE_SECRET_KEY: "synthetic-real-mode-secret" }, config.ALLOWED_ORIGINS[0]!), false);
    }
    globalThis.fetch = async () => { throw new Error("Synthetic timeout"); };
    assert.equal(await verifyTurnstile("test", config, config.SITE_ORIGIN), false);
    globalThis.fetch = async () => Response.json({ success: true, hostname: "localhost", action: "order" });
    assert.equal(await verifyTurnstile("test", { ...config, TURNSTILE_SECRET_KEY: "synthetic-real-mode-secret" }, config.ALLOWED_ORIGINS[0]!), true);
  } finally { globalThis.fetch = originalFetch; }
});

test("order API security against a real isolated PostgreSQL database", async t => {
  const db = postgres(databaseUrl, { max: 2 });
  const store = createOrderStore(databaseUrl);
  const handler = createOrderHandler(config, store, async () => true);
  async function reset() { await db`TRUNCATE audit_logs, orders, order_rate_events`; }
  try {
    await db`INSERT INTO products (id, slug, name, description, price_bdt, delivery_type, is_active) VALUES (${input.productId}, 'ai-setup', 'Local sample', 'Synthetic', 500, 'C', true) ON CONFLICT (id) DO UPDATE SET is_active = true, price_bdt = 500`;
    await t.test("valid order stores authoritative amount, normalized fields and atomic audit", async () => {
      await reset();
      const r = await handler(request()); assert.equal(r.status, 201);
      const response = await r.json();
      assert.deepEqual(Object.keys(response).sort(), ["amountExpected", "orderCode", "status", "whatsappLink"]);
      assert.equal(response.amountExpected, 500); assert.equal(response.status, "submitted");
      assert.ok(response.whatsappLink.startsWith("https://wa.me/8801700000000?text="));
      const [row] = await db`SELECT * FROM orders`; assert.equal(row!.amount_expected, 500); assert.equal(row!.trx_id, "ABCD1234"); assert.equal(row!.customer_email, "demo@example.com"); assert.equal(row!.sender_bkash_number, "01700000000"); assert.equal(row!.status, "submitted"); assert.equal(row!.client_ip_hash.length, 64);
      const [audit] = await db`SELECT * FROM audit_logs`; assert.equal(audit!.order_code, response.orderCode); assert.equal(audit!.order_id, row!.id); assert.equal(audit!.ip_hash, row!.client_ip_hash);
    });
    await t.test("duplicates and case variants return generic 409; concurrency has one winner", async () => {
      await reset(); assert.equal((await handler(request())).status, 201);
      for (const trxId of ["ABCD1234", "abcd1234"]) { const r = await handler(request({ ...input, trxId })); assert.equal(r.status, 409); assert.deepEqual(await r.json(), { error: { code: "TRX_CONFLICT", message: "This TrxID is invalid or has already been used." } }); }
      await reset(); const responses = await Promise.all([handler(request()), handler(request())]); assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    });
    await t.test("strict schema rejects price, amount, status, unknown fields and malformed values", async () => {
      for (const field of ["price", "amountExpected", "status", "adminId"]) { await reset(); assert.equal((await handler(request({ ...input, [field]: 1 }))).status, 400); }
      for (const patch of [{ customerName: "a\nB" }, { customerEmail: "bad" }, { productId: "bad" }, { senderBkashNumber: "01200000000" }, { whatsapp: "bad" }]) assert.equal(orderSchema.safeParse({ ...input, ...patch }).success, false);
    });
    await t.test("SQL injection text is safely stored or rejected in every field; XSS is rejected", async () => {
      for (const payload of ["' OR 1=1 --", '"; DROP TABLE orders;--', "<script>alert(1)</script>"]) {
        for (const field of ["customerName", "customerEmail", "whatsapp", "senderBkashNumber", "trxId", "productId", "turnstileToken"]) {
          await reset(); const r = await handler(request({ ...input, [field]: payload }));
          if (r.status === 201) { const [row] = await db`SELECT customer_name FROM orders`; if (field === "customerName") assert.equal(row!.customer_name, payload); }
          else assert.equal(r.status, 400);
          assert.ok(!(await r.text()).includes(payload));
          assert.equal((await db`SELECT count(*)::int AS n FROM products WHERE id = ${input.productId}`)[0]!.n, 1);
        }
      }
    });
    await t.test("inactive and missing products fail", async () => {
      await reset(); await db`UPDATE products SET is_active = false WHERE id = ${input.productId}`;
      assert.equal((await handler(request())).status, 400);
      await db`UPDATE products SET is_active = true WHERE id = ${input.productId}`;
      assert.equal((await handler(request({ ...input, productId: "00000000-0000-4000-8000-000000000099" }))).status, 400);
    });
    await t.test("origin, content type, body length and malformed JSON", async () => {
      await reset(); assert.equal((await handler(request(input, { Origin: "https://evil.example" }))).status, 403);
      assert.equal((await handler(request(input, { Origin: "null" }))).status, 403);
      assert.equal((await handler(request(input, { "Content-Type": "text/plain" }))).status, 415);
      assert.equal((await handler(request({ ...input, extra: "x".repeat(11000) }))).status, 413);
      const bad = new Request("http://localhost:3000/api/orders", { method: "POST", headers: { Origin: config.ALLOWED_ORIGINS[0]!, "Content-Type": "application/json" }, body: "{" });
      assert.equal((await handler(bad)).status, 400);
      assert.equal((await db`SELECT count(*)::int AS n FROM orders`)[0]!.n, 0);
    });
    await t.test("captcha failures reject before data validation and creation", async () => {
      await reset(); const reject = createOrderHandler(config, store, async () => false);
      assert.equal((await reject(request())).status, 403);
      assert.equal((await db`SELECT count(*)::int AS n FROM orders`)[0]!.n, 0);
    });
    await t.test("sliding rate limits work across concurrent requests and both windows", async () => {
      await reset(); const replies = await Promise.all(Array.from({ length: 6 }, () => handler(request({ ...input, extra: true }))));
      assert.equal(replies.filter(r => r.status === 400).length, 5); const limited = replies.find(r => r.status === 429)!; assert.ok(Number(limited.headers.get("retry-after")) > 0);
      await reset(); const hash = hashIp("127.0.0.1", config.IP_HASH_SECRET);
      await db`INSERT INTO order_rate_events (ip_hash, created_at) SELECT ${hash}, now() - interval '1 hour' FROM generate_series(1, 20)`;
      assert.equal((await handler(request())).status, 429);
    });
    await t.test("order-code collisions retry and exhausted retries fail without leaks", async () => {
      await reset(); const parsed = orderSchema.parse(input);
      const fixed = createOrderStore(databaseUrl, () => "ORD-ABCDEFGH");
      try {
        await fixed.create(parsed, "testhash");
        const exhausted = createOrderHandler(config, fixed, async () => true);
        const r = await exhausted(request({ ...input, trxId: "ZXCV1234" })); assert.equal(r.status, 500); assert.deepEqual(await r.json(), { error: { code: "INTERNAL", message: "Unable to submit order. Please try later." } });
        let calls = 0; const retry = createOrderStore(databaseUrl, () => ++calls === 1 ? "ORD-ABCDEFGH" : "ORD-BCDEFGHJ");
        try { const order = await retry.create({ ...parsed, trxId: "ZXCV1234" }, "hash"); assert.equal(order.orderCode, "ORD-BCDEFGHJ"); assert.equal(calls, 2); } finally { await retry.close(); }
      } finally { await fixed.close(); }
    });
    await t.test("database rejects invalid status, amount, unnormalized and duplicate TrxID directly", async () => {
      await reset(); await store.create(orderSchema.parse(input), "hash");
      for (const [column, value] of [["status", "paid"], ["amount_expected", 0], ["trx_id", "abcd1234"]] as const) {
        await assert.rejects(db`UPDATE orders SET ${db(column)} = ${value}`, error => (error as { code?: string }).code === "23514");
      }
      await assert.rejects(store.create(orderSchema.parse(input), "hash"));
    });
  } finally { await reset(); await store.close(); await db.end(); }
});
