import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { createOrderStore } from "../src/lib/orders/store.ts";
import { createTrackingHandler } from "../src/lib/orders/tracking-handler.ts";
import { statusMessages } from "../src/lib/orders/tracking-view.ts";
import { hashIp } from "../src/lib/orders/security.ts";
import type { OrderEnv } from "../src/lib/env/orders.ts";
import { GET, PUT, PATCH, DELETE, OPTIONS, HEAD } from "../src/app/api/orders/track/route.ts";

const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:55432/ecommerce_test";
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Tracking tests require a loopback test database.");
const config: OrderEnv = { DATABASE_URL: databaseUrl, IP_HASH_SECRET: "synthetic-tracking-hmac-secret-32-characters", TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA", SITE_ORIGIN: "http://localhost:3000", ALLOWED_ORIGINS: ["http://localhost:3000"], TRUSTED_PROXY_MODE: "vercel", ADMIN_WHATSAPP_NUMBER: "8801000000000", BKASH_RECIPIENT_NUMBER: "01000000000" };
const input = { orderCode: "ORD-ABCDEFGH", last4: "0000", turnstileToken: "synthetic-token" };
function request(body: unknown = input, ip = "192.0.2.1", headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/orders/track", { method: "POST", headers: { Origin: config.SITE_ORIGIN, "Content-Type": "application/json", "x-forwarded-for": ip, ...headers }, body: JSON.stringify(body) });
}

test("tracking security with real PostgreSQL", async t => {
  const db = postgres(databaseUrl, { max: 5 });
  const store = createOrderStore(databaseUrl);
  const handler = createTrackingHandler(config, store, async () => true);
  const codeHash = hashIp(`tracking-code:${input.orderCode}`, config.IP_HASH_SECRET);
  async function reset() { await db`TRUNCATE tracking_code_limits, order_rate_events, audit_logs`; }
  async function check(response: Response, status: number) { assert.equal(response.status, status);assert.match(response.headers.get("cache-control") ?? "", /no-store/);return response.json(); }
  try {
    await db`INSERT INTO products (id, slug, name, description, price_bdt, delivery_type, is_active) VALUES ('00000000-0000-4000-8000-000000000001','ai-setup','Synthetic tracking product','Local only',500,'C',true) ON CONFLICT (id) DO NOTHING`;
    await db`INSERT INTO orders (order_code,product_id,customer_name,customer_email,sender_bkash_number,trx_id,amount_expected,admin_note,client_ip_hash) VALUES (${input.orderCode},'00000000-0000-4000-8000-000000000001','Synthetic Customer','synthetic@example.com','01700000000','TRACK123',500,'synthetic private note','synthetic-private-hash')`;
    await t.test("normalized lookup exposes only the minimal view", async () => {
      await reset();
      const result = await store.tracking.lookupOrder(" ord-abcdefgh ", "0000");assert.ok(result);
      assert.deepEqual(Object.keys(result).sort(), ["amountExpected","createdAt","message","orderCode","productName","status"]);
      assert.equal(result.amountExpected,500);assert.equal(result.orderCode,input.orderCode);
      const text=JSON.stringify(result);for(const secret of ['synthetic@example.com','01700000000','TRACK123','synthetic private note','synthetic-private-hash'])assert.ok(!text.includes(secret));
      await check(await handler(request()),200);
    });
    await t.test("missing order and wrong suffix have identical HTTP status and body", async () => {
      await reset();const wrong=await check(await handler(request({...input,last4:"1234"})),404);
      const missing=await check(await handler(request({...input,orderCode:"ORD-ZZZZZZZZ"})),404);
      assert.deepEqual(missing,wrong);assert.equal(await store.tracking.lookupOrder("ORD-ZZZZZZZZ","0000"),null);
    });
    await t.test("all statuses have the expected safe bilingual message", async () => {
      // Build independent status fixtures; production updates now enforce transitions.
      async function fixtureStatus(status: string) {
        const [row] = await db`DELETE FROM orders WHERE order_code=${input.orderCode} RETURNING *`;
        await db`INSERT INTO orders(order_code,product_id,customer_name,customer_email,sender_bkash_number,trx_id,amount_expected,status) VALUES (${row!.order_code},${row!.product_id},${row!.customer_name},${row!.customer_email},${row!.sender_bkash_number},${row!.trx_id},${row!.amount_expected},${status})`;
      }
      const expected={submitted:["অপেক্ষায়","awaiting"],verified:["যাচাই হয়েছে","verified"],delivered:["সম্পন্ন","completed"],rejected:["গ্রহণ করা হয়নি","rejected"],refunded:["ফেরত","Refund"]};
      for(const status of Object.keys(statusMessages) as Array<keyof typeof statusMessages>){
        await fixtureStatus(status);
        const view=await store.tracking.lookupOrder(input.orderCode,"0000");assert.equal(view?.status,status);assert.deepEqual(view?.message,statusMessages[status]);assert.ok(view!.message.bn.includes(expected[status][0]!));assert.ok(view!.message.en.includes(expected[status][1]!));
      }
      await fixtureStatus('submitted');
    });
    await t.test("invalid formats, unknown keys, SQLi and XSS rejected", async () => {
      const patches=[{last4:"123"},{last4:"12345"},{last4:"abcd"},{orderCode:"ORD-00000000"},{orderCode:"ORD-IIIIIIII"},{price:1},{last4:"' OR 1=1 --"},{orderCode:'"; DROP TABLE orders;--'},{last4:"<script>alert(1)</script>"},{orderCode:"<script>alert(1)</script>"}];
      for(const patch of patches){await reset();await check(await handler(request({...input,...patch})),400);}
    });
    await t.test("request boundary and captcha failures",async()=>{
      await reset();await check(await handler(request(input,undefined,{Origin:"https://evil.example"})),403);
      await check(await handler(request(input,undefined,{"Content-Type":"text/plain"})),415);
      await check(await handler(request({...input,extra:"x".repeat(11000)})),413);
      const reject=createTrackingHandler(config,store,async()=>false);await check(await reject(request()),403);
      const row=await db`SELECT count(*)::int AS n FROM tracking_code_limits`;assert.equal(row[0]!.n,0);
    });
    await t.test("IP limit is ten attempts per ten minutes",async()=>{
      await reset();for(let i=0;i<10;i++)await check(await handler(request()),200);
      const limited=await handler(request());await check(limited,429);assert.ok(Number(limited.headers.get("retry-after"))>0);
      const rows=await db`SELECT failures FROM tracking_code_limits WHERE code_hash=${codeHash}`;assert.equal(rows[0]!.failures,0);
    });
    await t.test("five failures lock a code across IPs; successes do not reset or count",async()=>{
      await reset();for(let i=0;i<4;i++)await check(await handler(request({...input,last4:"1234"},`192.0.2.${i+1}`)),404);
      await check(await handler(request(input,"192.0.2.20")),200);
      assert.equal((await db`SELECT failures FROM tracking_code_limits WHERE code_hash=${codeHash}`)[0]!.failures,4);
      await check(await handler(request({...input,last4:"1234"},"192.0.2.21")),404);
      const locked=await handler(request(input,"192.0.2.22"));await check(locked,429);assert.ok(Number(locked.headers.get("retry-after"))>=899);
      await db`UPDATE tracking_code_limits SET locked_until=clock_timestamp()-interval '1 second' WHERE code_hash=${codeHash}`;
      await check(await handler(request(input,"192.0.2.23")),200);assert.equal((await db`SELECT failures FROM tracking_code_limits WHERE code_hash=${codeHash}`)[0]!.failures,0);
    });
    await t.test("concurrent failures cannot race past the per-code lock",async()=>{
      await reset();const responses=await Promise.all(Array.from({length:8},(_,i)=>handler(request({...input,last4:"1234"},`192.0.2.${i+50}`))));
      assert.equal(responses.filter(r=>r.status===404).length,5);assert.equal(responses.filter(r=>r.status===429).length,3);
    });
    await t.test("security audit contains hashes/results, no submitted credentials",async()=>{
      await reset();await handler(request({...input,last4:"1234"}));await handler(request());
      const rows=await db`SELECT * FROM audit_logs ORDER BY created_at`;assert.equal(rows.length,2);
      assert.deepEqual(rows.map(r=>r.action),['track.not_found','track.found']);
      for(const row of rows){assert.equal(row.order_code,codeHash);assert.equal(row.order_id,null);assert.equal(row.ip_hash,hashIp('192.0.2.1',config.IP_HASH_SECRET));}
      const serialized=JSON.stringify(rows);for(const value of [input.orderCode,'synthetic@example.com','01700000000','TRACK123','synthetic private note'])assert.ok(!serialized.includes(value));
    });
    await t.test("all unsupported route methods fail with Allow and no-store",async()=>{
      for(const method of [GET,PUT,PATCH,DELETE,OPTIONS,HEAD]){const r=method();await check(r,405);assert.equal(r.headers.get('allow'),'POST');}
    });
  } finally {
    await reset();await db`DELETE FROM orders WHERE order_code=${input.orderCode}`;await store.close();await db.end();
  }
});
