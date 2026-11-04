import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import postgres from 'postgres';
import { createAdminStore } from '../src/lib/admin/store.ts';
import { digest, opaque } from '../src/lib/admin/crypto.ts';
import { createAdminHandler } from '../src/lib/admin/handler.ts';
import { createOrderStore } from '../src/lib/orders/store.ts';
import { createDeliveryStore } from '../src/lib/delivery/store.ts';
import { decryptDeliveryCode, encryptDeliveryCode, fingerprintDeliveryCode } from '../src/lib/delivery/crypto.ts';
import { renderDeliveryEmail } from '../src/lib/delivery/email.ts';
import { connectDatabase } from '../src/db/client.ts';
import { createTrackingStore } from '../src/lib/orders/tracking-store.ts';
import type { AdminEnv } from '../src/lib/admin/config.ts';

const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:55432/ecommerce_test';
const key = randomBytes(32).toString('base64');

test('delivery code encryption and email escaping', () => {
  const code = 'SYNTHETIC-CODE-123456';
  const first = encryptDeliveryCode(code, key), second = encryptDeliveryCode(code, key);
  assert.equal(decryptDeliveryCode(first.ciphertext, key), code);
  assert.equal(first.iv.length, 12);
  assert.notDeepEqual(first.iv, second.iv);
  assert.notEqual(fingerprintDeliveryCode(code, key), fingerprintDeliveryCode('OTHER-CODE-123456', key));
  const parts = first.ciphertext.split('.');
  parts[2] = Buffer.from('tampered').toString('base64');
  assert.throws(() => decryptDeliveryCode(parts.join('.'), key));

  const message = renderDeliveryEmail({
    to: 'customer@example.invalid', from: 'store@example.invalid', orderCode: 'ORD-ABCDEFGH',
    productName: '<script>alert(1)</script>', deliveryCode: code,
    instructions: '<img src=x onerror=alert(1)>', supportUrl: 'https://wa.me/8801000000000',
  });
  assert.deepEqual(message.to, ['customer@example.invalid']);
  assert.ok(message.html.includes('&lt;script&gt;'));
  assert.ok(message.html.includes('&lt;img'));
  assert.ok(!message.html.includes('<script>') && !message.html.includes('<img'));
  assert.ok(message.text.includes('আপনার অর্ডার প্রস্তুত'));
  assert.ok(message.text.includes('Your order is ready'));
  assert.ok(message.text.includes(code));
});

test('delivery inventory, assignment, reveal, email, void and delivery remain transactional', async t => {
  const db = postgres(url, { max: 8, prepare: false });
  const adminStore = createAdminStore(url, key), limiter = createOrderStore(url), delivery = createDeliveryStore(url, key);
  const adminEmail = `delivery-test-${randomBytes(8).toString('hex')}@example.invalid`;
  const ip = 'synthetic-delivery-ip', ua = digest('synthetic-delivery-agent');
  const token = opaque(), csrf = opaque();
  let admin = '', product = '';
  const orders: string[] = [];
  const env: AdminEnv = {
    DATABASE_URL: url, IP_HASH_SECRET: opaque(), TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA', SITE_ORIGIN: 'https://localhost:3000',
    ALLOWED_ORIGINS: ['https://localhost:3000'], TRUSTED_PROXY_MODE: 'local', ADMIN_WHATSAPP_NUMBER: '8801000000000',
    BKASH_RECIPIENT_NUMBER: '01000000000', ADMIN_SECRET_KEY: key, ADMIN_PATH_PREFIX: '/manage-test',
    ADMIN_IP_ALLOWLIST: [], DELIVERY_CODE_KEY: key, EMAIL_FROM: 'delivery@example.invalid', EMAIL_MODE: 'resend', RESEND_API_KEY: 'synthetic-resend-key',
  };
  const handler = createAdminHandler(env, adminStore, limiter, async () => true, delivery);
  const api = (path: string, body: unknown, session = token, csrfToken = csrf) => handler(new Request(`https://localhost:3000/manage-test/api/${path}`, {
    method: 'POST', headers: { origin: env.SITE_ORIGIN, 'content-type': 'application/json', 'user-agent': 'synthetic-delivery-agent',
      cookie: `__Host-admin=${session}`, ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) }, body: JSON.stringify(body),
  }), path);
  try {
    const [user] = await db`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted) VALUES (${adminEmail},'synthetic-hash','synthetic-encrypted-secret') RETURNING id`;
    admin = user!.id;
    await db`INSERT INTO admin_sessions(id,admin_id,csrf_hash,authenticated,expires_at,ip_hash,user_agent_hash) VALUES (${digest(token)},${admin},${digest(csrf)},true,now()+interval '8 hours',${ip},${ua})`;
    const [item] = await db`INSERT INTO products(slug,name,description,price_bdt,delivery_type,is_active,delivery_instructions) VALUES (${`delivery-test-${randomBytes(8).toString('hex')}`},'<script>Product</script>','Synthetic',500,'B',true,'<img src=x onerror=alert(1)>') RETURNING id`;
    product = item!.id;
    async function makeOrder(status: 'submitted' | 'verified') {
      const code = `ORD-${randomBytes(8).toString('hex').toUpperCase().replace(/[01]/g, 'A').slice(0, 8)}`;
      await db`INSERT INTO orders(order_code,product_id,customer_name,customer_email,whatsapp,sender_bkash_number,trx_id,amount_expected,status,verified_by,verified_at) VALUES (${code},${product},'<svg onload=alert(1)>','only-this-customer@example.invalid','8801712345678','01700000000',${opaque().replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase()},500,${status},${status === 'verified' ? admin : null},${status === 'verified' ? new Date() : null})`;
      orders.push(code);
      return code;
    }
    const firstOrder = await makeOrder('verified'), secondOrder = await makeOrder('verified'), submittedOrder = await makeOrder('submitted'), unassignedVerifiedOrder = await makeOrder('verified');

    await t.test('bulk upload reports counts only and blocks normalized duplicates', async () => {
      const result = await delivery.upload(['SYNTH-CODE-111111', ' SYNTH-CODE- 111111 ', 'INVALID!', 'SYNTH-CODE-222222', 'SYNTH-CODE-333333'], product, admin, ip, token);
      assert.deepEqual(result, { added: 3, duplicates: 1, invalid: 1 });
      assert.ok(!JSON.stringify(result).includes('SYNTH-CODE'));
      const rows = await db`SELECT code_encrypted,code_fingerprint,encryption_iv FROM delivery_codes WHERE product_id=${product}`;
      assert.equal(rows.length, 3);
      assert.equal(new Set(rows.map(r => Buffer.from(r.encryption_iv).toString('hex'))).size, 3);
      assert.ok(rows.every(r => !String(r.code_encrypted).includes('SYNTH-CODE')));
    });

    await t.test('only verified orders can reserve; concurrent clicks and orders cannot share a code', async () => {
      assert.equal(await delivery.assign(submittedOrder, admin, ip, token), null);
      const simultaneous = await Promise.all([delivery.assign(firstOrder, admin, ip, token), delivery.assign(firstOrder, admin, ip, token)]);
      assert.ok(simultaneous.every(v => v?.assigned));
      const assigned = await db`SELECT dc.id,dc.code_fingerprint,dc.status FROM delivery_codes dc JOIN orders o ON o.id=dc.order_id WHERE o.order_code=${firstOrder}`;
      assert.equal(assigned.length, 1);
      const second = await delivery.assign(secondOrder, admin, ip, token);
      assert.equal(second?.assigned, true);
      const fingerprints = await db`SELECT dc.code_fingerprint FROM delivery_codes dc JOIN orders o ON o.id=dc.order_id WHERE o.order_code IN (${firstOrder},${secondOrder})`;
      assert.equal(new Set(fingerprints.map(r => r.code_fingerprint)).size, 2);
    });

    await t.test('reveal is CSRF protected, no-store and audited; half sessions are denied', async () => {
      const denied = await api('codes/reveal', { orderCode: firstOrder }, token, '');
      assert.equal(denied.status, 403);
      const pending = opaque();
      await db`INSERT INTO admin_sessions(id,admin_id,csrf_hash,authenticated,expires_at,ip_hash,user_agent_hash) VALUES (${digest(pending)},${admin},${digest(csrf)},false,now()+interval '8 hours',${ip},${ua})`;
      assert.equal((await api('codes/reveal', { orderCode: firstOrder }, pending)).status, 404);
      const response = await api('codes/reveal', { orderCode: firstOrder });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control') ?? '', /no-store/);
      const revealed = (await response.json()).code as string;
      assert.ok(['SYNTH-CODE-111111', 'SYNTH-CODE-222222', 'SYNTH-CODE-333333'].includes(revealed));
      assert.equal((await db`SELECT count(*)::int AS n FROM audit_logs WHERE action='admin.delivery.code.revealed'`)[0]!.n, 1);
    });

    await t.test('email uses only the order recipient, escapes HTML, caps three attempts, and failures do not change status', async () => {
      let captured: { to: string[]; html: string } | undefined;
      const failed = await delivery.send(secondOrder, admin, ip, token, { from: env.EMAIL_FROM, apiKey: env.RESEND_API_KEY, mode: 'resend', supportNumber: env.ADMIN_WHATSAPP_NUMBER }, async () => { throw new Error('synthetic provider failure'); });
      assert.equal(failed.sent, false);
      assert.equal((await db`SELECT status FROM orders WHERE order_code=${secondOrder}`)[0]!.status, 'verified');
      const sent = await delivery.send(secondOrder, admin, ip, token, { from: env.EMAIL_FROM, apiKey: env.RESEND_API_KEY, mode: 'resend', supportNumber: env.ADMIN_WHATSAPP_NUMBER }, async message => { captured = message; });
      assert.equal(sent.sent, true);
      assert.deepEqual(captured?.to, ['only-this-customer@example.invalid']);
      assert.ok(captured?.html.includes('&lt;script&gt;'));
      assert.ok(captured?.html.includes('&lt;img'));
      assert.ok(!captured?.html.includes('<script>') && !captured?.html.includes('<img'));
      const original = console.info; const logs: string[] = [];
      console.info = (...args: unknown[]) => logs.push(args.join(' '));
      try { assert.equal((await delivery.send(secondOrder, admin, ip, token, { from: env.EMAIL_FROM, apiKey: '', mode: 'log-safe', supportNumber: env.ADMIN_WHATSAPP_NUMBER })).sent, true); }
      finally { console.info = original; }
      assert.ok(logs.length);
      assert.ok(!['SYNTH-CODE-111111', 'SYNTH-CODE-222222', 'SYNTH-CODE-333333'].some(code => logs.join(' ').includes(code)));
      assert.ok(logs.join(' ').includes('[REDACTED]'));
      assert.equal((await delivery.send(secondOrder, admin, ip, token, { from: env.EMAIL_FROM, apiKey: '', mode: 'log-safe', supportNumber: env.ADMIN_WHATSAPP_NUMBER })).limited, true);
    });

    await t.test('void unassigns and returns a verified order; delivery requires code and tracking hides it', async () => {
      const [assignedCode] = await db`SELECT id FROM delivery_codes WHERE order_id=(SELECT id FROM orders WHERE order_code=${firstOrder})`;
      assert.equal(await delivery.voidCode(assignedCode!.id, 'Synthetic invalid code', admin, ip, token), true);
      assert.equal((await db`SELECT status FROM orders WHERE order_code=${firstOrder}`)[0]!.status, 'verified');
      const [voided] = await db`SELECT status,order_id,void_reason FROM delivery_codes WHERE id=${assignedCode!.id}`;
      assert.equal(voided!.status, 'void'); assert.equal(voided!.order_id, null); assert.equal(voided!.void_reason, 'Synthetic invalid code');
      assert.equal(await adminStore.action(submittedOrder, 'delivered', '', '', admin, ip, token, 'whatsapp'), false);
      assert.equal(await adminStore.action(unassignedVerifiedOrder, 'delivered', '', '', admin, ip, token, 'whatsapp'), false);
      assert.equal((await delivery.assign(firstOrder, admin, ip, token))?.assigned, true);
      assert.equal(await adminStore.action(firstOrder, 'delivered', '', '', admin, ip, token, 'whatsapp'), true);
      const tracked = await connectDatabase(url);
      try {
        const view = await createTrackingStore(tracked.db).lookupOrder(firstOrder, '0000');
        assert.equal(view?.deliveryDestination, '••••5678');
        assert.ok(!JSON.stringify(view).includes('SYNTH-CODE'));
      } finally { await tracked.close(); }
      const auditRows = await db`SELECT action,order_code FROM audit_logs`;
      assert.ok(!JSON.stringify(auditRows).includes('SYNTH-CODE'));
    });
  } finally {
    await db`DELETE FROM audit_logs WHERE order_id IN (SELECT id FROM orders WHERE order_code=ANY(${orders})) OR admin_id=${admin || null}`;
    await db`DELETE FROM delivery_email_attempts WHERE order_id IN (SELECT id FROM orders WHERE order_code=ANY(${orders}))`;
    await db`DELETE FROM delivery_codes WHERE product_id=${product || null}`;
    await db`DELETE FROM orders WHERE order_code=ANY(${orders})`;
    if (product) await db`DELETE FROM products WHERE id=${product}`;
    await db`DELETE FROM admin_users WHERE id=${admin || null}`;
    await adminStore.close(); await limiter.close(); await delivery.close(); await db.end();
  }
});
