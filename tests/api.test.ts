import assert from "node:assert/strict";
import { migrateMarketplace, seedMarketplaceAdmin, seedMarketplaceProduct } from "./helpers/marketplace-database.ts";
import test, { before, after } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { POST as quoteRoute } from "../src/app/api/orders/quote/route.ts";
import { POST as claimRoute } from "../src/app/api/orders/route.ts";
import { POST as trackRoute } from "../src/app/api/orders/track/route.ts";
import { POST as loginRoute } from "../src/app/api/admin/auth/login/route.ts";
import { POST as logoutRoute } from "../src/app/api/admin/auth/logout/route.ts";
import { GET as sessionRoute } from "../src/app/api/admin/auth/session/route.ts";
import { GET as orderListRoute } from "../src/app/api/admin/orders/route.ts";
import { PATCH as updateRoute } from "../src/app/api/admin/orders/[id]/route.ts";
import { GET as productsRoute } from "../src/app/api/products/route.ts";
import { GET as productRoute } from "../src/app/api/products/[slug]/route.ts";
import {
  GET as adminProductsRoute,
  POST as createProductRoute,
} from "../src/app/api/admin/products/route.ts";
import { PATCH as editProductRoute } from "../src/app/api/admin/products/[id]/route.ts";
import { GET as overviewRoute } from "../src/app/api/admin/overview/route.ts";
import { GET as auditRoute } from "../src/app/api/admin/audit/route.ts";
import { GET as detailRoute } from "../src/app/api/admin/orders/[id]/route.ts";
import { POST as noteRoute } from "../src/app/api/admin/orders/[id]/notes/route.ts";
import { api, readJson, assertOrigin, json } from "../src/lib/security/http.ts";
import { verifyTurnstile } from "../src/lib/security/turnstile.ts";
import { quoteSchema } from "../src/lib/validation.ts";
import { createToken, randomUUID } from "../src/lib/security/crypto.ts";
import { checkoutSettings } from "../src/lib/config.ts";
const db = new PGlite();
const actor = randomUUID();
const providerActor = randomUUID();
const productId = randomUUID();
const factorId = randomUUID();
const challengeId = randomUUID();
const passwordToken = createToken() + ".password.signature";
let mfaEnrolled = true;
const authToken = createToken() + ".synthetic.signature";
const appUrl = "https://synthetic-market.example";
const originalFetch = globalThis.fetch;
const savedEnv = { ...process.env };
const consumed = new Set<string>();
let databaseDown = false;
let authDown = false;
let botDown = false;
async function getProduct(slug: string) {
  return productRoute(new Request(`${appUrl}/api/products/${encodeURIComponent(slug)}`), { params: Promise.resolve({ slug }) });
}
before(async () => {
  Object.assign(process.env, {
    SUPABASE_URL: "https://synthetic.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "SYNTHETIC_SERVER_ROLE_TOKEN",
    APP_URL: appUrl,
    CHECKOUT_ENABLED: "true",
    POLICIES_APPROVED: "true",
    CATALOG_APPROVED: "true",
    BKASH_RECIPIENT_NUMBER: "01700000000",
    BKASH_PAYMENT_METHOD: "payment",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "SYNTHETIC_SITE_KEY",
    TURNSTILE_SECRET_KEY: "SYNTHETIC_BOT_SECRET",
    TRUSTED_CLIENT_IP_HEADER: "cf-connecting-ip",
  });
  await migrateMarketplace(db);
  await seedMarketplaceAdmin(db, actor, providerActor);
  await seedMarketplaceProduct(db, productId);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.includes("challenges.cloudflare.com")) {
      if (botDown) throw new Error("SYNTHETIC_BOT_SECRET unreachable");
      const token = String(body.response);
      const success = token.startsWith("valid-") && !consumed.has(token);
      consumed.add(token);
      return Response.json({
        success,
        hostname: token.includes("wrong-host")
          ? "evil.example"
          : new URL(appUrl).hostname,
        action: token.includes("wrong-action") ? "other" : "payment_claim",
      });
    }
    if (url.includes("/auth/v1/")) {
      if (authDown) throw new Error("SYNTHETIC_SERVER_ROLE_TOKEN unreachable");
      if (url.includes("/token?")) {
        assert.equal("mfaCode" in body, false);
        return body.password === "synthetic-password"
          ? Response.json({ access_token: passwordToken, expires_in: 3600,
              user: { id: providerActor, factors: mfaEnrolled ? [{ id: factorId, factor_type: "totp", status: "verified" }] : [] } })
          : Response.json({ error: "bad_password" }, { status: 400 });
      }
      const headers = new Headers(init?.headers);
      if (url.endsWith(`/factors/${factorId}/challenge`)) {
        assert.equal(headers.get("authorization"), "Bearer " + passwordToken);
        return Response.json({ id: challengeId });
      }
      if (url.endsWith(`/factors/${factorId}/verify`)) {
        assert.equal(headers.get("authorization"), "Bearer " + passwordToken);
        assert.equal(body.challenge_id, challengeId);
        return body.code === "123456"
          ? Response.json({ access_token: authToken, expires_in: 3600 })
          : Response.json({ error: "bad_mfa" }, { status: 422 });
      }
      return headers.get("authorization") === "Bearer " + authToken
        ? Response.json({ id: providerActor })
        : Response.json({ error: "bad_token" }, { status: 401 });
    }
    if (databaseDown)
      throw new Error("SYNTHETIC_SERVER_ROLE_TOKEN unreachable");
    if (url.includes("/rest/v1/rpc/")) {
      const name = new URL(url).pathname.split("/").at(-1)!;
      assert.match(name, /^ai_[a-z_]+$/);
      const entries = Object.entries(body);
      const names = entries
        .map(([key], i) => {
          assert.match(key, /^p_[a-z_]+$/);
          return key + " => $" + (i + 1);
        })
        .join(",");
      try {
        const result = await db.query<{ value: unknown }>(
          "SELECT public." + name + "(" + names + ") AS value",
          entries.map(([, value]) => value),
        );
        return Response.json(result.rows[0]!.value);
      } catch (error) {
        const e = error as { code: string; message: string };
        return Response.json(
          { code: e.code, message: e.message },
          { status: 400 },
        );
      }
    }
    throw new Error("Unexpected test network call");
  };
});

test("single-product API exposes only the active catalog projection and hides unknown/inactive products", async () => {
  const response = await getProduct("synthetic-service");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  const data = await response.json();
  assert.equal(data.product.id, productId);
  assert.equal(data.product.pricePoisha, 50000);
  assert.equal(data.sample, false);
  assert.equal(data.product.storefrontMetadata, undefined);
  const unknown = await getProduct("unknown");
  assert.equal(unknown.status, 404);
  await db.query("UPDATE public.products SET is_active=false WHERE id=$1", [productId]);
  try {
    const inactive = await getProduct("synthetic-service");
    assert.equal(inactive.status, 404);
    assert.deepEqual(await inactive.json(), await unknown.json());
  } finally { await db.query("UPDATE public.products SET is_active=true WHERE id=$1", [productId]); }
});

test("single-product API rejects malformed identifiers and fails closed on configured outages", async () => {
  databaseDown = true;
  try {
    for (const slug of ["../admin", "' OR 1=1 --", "a".repeat(81), ""]) {
      assert.equal((await getProduct(slug)).status, 404);
    }
    const unavailable = await getProduct("synthetic-service");
    assert.equal(unavailable.status, 503);
    assert.ok(!(await unavailable.text()).includes("SYNTHETIC_SERVER_ROLE_TOKEN"));
  } finally { databaseDown = false; }
});

test("single-product API labels unconfigured samples and does not enable their purchase", async () => {
  const config = { SUPABASE_URL: process.env.SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY! };
  const databaseUrl = process.env.DATABASE_URL;
  Object.assign(process.env, { SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", DATABASE_URL: "" });
  try {
    const response = await getProduct("ai-setup");
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.sample, true);
    assert.equal(data.product.active, false);
    assert.equal(checkoutSettings().ordersOpen, false);
  } finally {
    Object.assign(process.env, config);
    if (databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = databaseUrl;
  }
});
after(async () => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env))
    if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  await db.close();
});
let ipCounter = 1;
function request(
  path: string,
  body?: unknown,
  extra: Record<string, string> = {},
  method = body === undefined ? "GET" : "POST",
) {
  return new Request(appUrl + path, {
    method,
    headers: {
      origin: appUrl,
      "cf-connecting-ip": "127.0.0." + ipCounter++,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function createQuote() {
  const response = await quoteRoute(
    request("/api/orders/quote", { productId }),
  );
  assert.equal(response.status, 201);
  return (await response.json()).quote as {
    quoteToken: string;
    orderCode: string;
    amountPoisha: number;
  };
}
const claim = (quoteToken: string, extras: Record<string, unknown> = {}) => ({
  quoteToken,
  customerName: "Synthetic Customer",
  customerEmail: "demo@example.com",
  bkashSender: "01700000000",
  whatsapp: "",
  trxId: createToken().slice(0, 10),
  turnstileToken: "valid-" + createToken(),
  acceptedTerms: true,
  ...extras,
});
test("full route flow: quote, claim, private tracking, admin verification, delivery and logout", async () => {
  const q = await createQuote();
  assert.equal(q.amountPoisha, 50000);
  const tampered = await claimRoute(
    request("/api/orders", claim(q.quoteToken, { pricePoisha: 1 })),
  );
  assert.equal(tampered.status, 422);
  const submitted = await claimRoute(
    request("/api/orders", claim(q.quoteToken)),
  );
  assert.equal(submitted.status, 201);
  const receipt = await submitted.json();
  assert.equal(receipt.order.status, "submitted");
  const tracking = {
    orderCode: q.orderCode,
    customerEmail: "demo@example.com",
    accessKey: receipt.accessKey,
  };
  assert.equal(
    (
      await trackRoute(
        request("/api/orders/track", { ...tracking, accessKey: createToken() }),
      )
    ).status,
    404,
  );
  const publicBefore = await (
    await trackRoute(request("/api/orders/track", tracking))
  ).json();
  assert.equal(publicBefore.order.status, "submitted");
  assert.equal("trxId" in publicBefore.order, false);
  const login = await loginRoute(
    request("/api/admin/auth/login", {
      email: "admin@example.com",
      password: "synthetic-password",
        mfaCode: "123456",
    }),
  );
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.equal((await login.json()).access_token, undefined);
  const headers = { cookie: cookie.split(";")[0]! };
  const list = await orderListRoute(
    request("/api/admin/orders", undefined, headers),
  );
  const orders = (await list.json()).orders as {
    id: string;
    orderCode: string;
  }[];
  const order = orders.find((o) => o.orderCode === q.orderCode)!;
  const context = { params: Promise.resolve({ id: order.id }) };
  assert.equal(
    (
      await updateRoute(
        request(
          "/api/admin/orders/" + order.id,
          {
            status: "verified",
            expectedVersion: 1,
            note: "Synthetic verification",
            verifiedAmountPoisha: 50000,
            checkedPayment: true,
          },
          {},
          "PATCH",
        ),
        context,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await updateRoute(
        request(
          "/api/admin/orders/" + order.id,
          {
            status: "verified",
            expectedVersion: 1,
            note: "Synthetic verification",
            verifiedAmountPoisha: 1,
            checkedPayment: true,
          },
          headers,
          "PATCH",
        ),
        context,
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await updateRoute(
        request(
          "/api/admin/orders/" + order.id,
          {
            status: "verified",
            expectedVersion: 1,
            note: "PRIVATE SYNTHETIC NOTE",
            verifiedAmountPoisha: 50000,
            checkedPayment: true,
          },
          headers,
          "PATCH",
        ),
        context,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await updateRoute(
        request(
          "/api/admin/orders/" + order.id,
          {
            status: "delivered",
            expectedVersion: 2,
            note: "PRIVATE DELIVERY NOTE",
            customerMessage: "Your service was delivered",
            completedDelivery: true,
          },
          headers,
          "PATCH",
        ),
        context,
      )
    ).status,
    200,
  );
  const publicAfter = await (
    await trackRoute(request("/api/orders/track", tracking))
  ).json();
  assert.equal(publicAfter.order.status, "delivered");
  assert.ok(!JSON.stringify(publicAfter).includes("PRIVATE"));
  assert.equal(
    (await logoutRoute(request("/api/admin/auth/logout", {}, headers))).status,
    200,
  );
  assert.equal(
    (await sessionRoute(request("/api/admin/auth/session", undefined, headers)))
      .status,
    401,
  );
});
test("origin, content type and actual streamed request sizes are enforced", async () => {
  assert.equal(
    (
      await quoteRoute(
        request(
          "/api/orders/quote",
          { productId },
          { origin: "https://evil.example" },
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await quoteRoute(
        new Request(appUrl + "/api/orders/quote", {
          method: "POST",
          body: JSON.stringify({ productId }),
          headers: { "content-type": "application/json" },
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await quoteRoute(
        request(
          "/api/orders/quote",
          { productId },
          { "content-type": "text/plain" },
        ),
      )
    ).status,
    415,
  );
  const huge = new Request(appUrl + "/api/orders/quote", {
    method: "POST",
    headers: {
      origin: appUrl,
      "content-type": "application/json",
      "content-length": "1",
    },
    body: JSON.stringify({ productId, padding: "x".repeat(20000) }),
  });
  assert.equal(
    (
      await api(async () => {
        assertOrigin(huge);
        return json(await readJson(huge, quoteSchema));
      })
    ).status,
    413,
  );
});
test("bot verification rejects bad context, replayed tokens and outages", async () => {
  const valid = "valid-" + createToken();
  await verifyTurnstile(valid, request("/api/orders", {}));
  await assert.rejects(
    () => verifyTurnstile(valid, request("/api/orders", {})),
    /নিরাপত্তা/,
  );
  for (const token of [
    "bad-token",
    "valid-wrong-host-" + createToken(),
    "valid-wrong-action-" + createToken(),
  ])
    await assert.rejects(
      () => verifyTurnstile(token, request("/api/orders", {})),
      /নিরাপত্তা/,
    );
  botDown = true;
  try {
    const q = await createQuote();
    const response = await claimRoute(
      request("/api/orders", claim(q.quoteToken)),
    );
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes("SYNTHETIC_BOT_SECRET"));
  } finally {
    botDown = false;
  }
});
test("configured database and auth outages fail closed without leaking secrets or falling back to samples", async () => {
  databaseDown = true;
  try {
    const response = await productsRoute();
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes("SYNTHETIC_SERVER_ROLE_TOKEN"));
  } finally {
    databaseDown = false;
  }
  authDown = true;
  try {
    const response = await loginRoute(
      request("/api/admin/auth/login", {
        email: "admin@example.com",
        password: "synthetic-password",
        mfaCode: "123456",
      }),
    );
    assert.equal(response.status, 503);
  } finally {
    authDown = false;
  }
});
test("rate limits return 429 with Retry-After; untrusted forwarding headers cannot create new buckets", async () => {
  const headers = { "cf-connecting-ip": "127.0.0.250" };
  const responses = [];
  for (let i = 0; i < 6; i++)
    responses.push(
      await quoteRoute(request("/api/orders/quote", { productId }, headers)),
    );
  assert.deepEqual(
    responses.map((r) => r.status),
    [201, 201, 201, 201, 201, 429],
  );
  assert.equal(responses[5]!.headers.get("retry-after"), "60");
  delete process.env.TRUSTED_CLIENT_IP_HEADER;
  try {
    const responses = [];
    for (let i = 0; i < 6; i++)
      responses.push(
        await quoteRoute(
          request(
            "/api/orders/quote",
            { productId },
            { "x-forwarded-for": "198.51.100." + i },
          ),
        ),
      );
    assert.deepEqual(
      responses.map((r) => r.status),
      [201, 201, 201, 201, 201, 429],
    );
  } finally {
    process.env.TRUSTED_CLIENT_IP_HEADER = "cf-connecting-ip";
  }
});
test("checkout cannot be enabled without approved policies, catalog, recipient and server configuration", () => {
  for (const key of [
    "BKASH_RECIPIENT_NUMBER",
    "TURNSTILE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "POLICIES_APPROVED",
    "CATALOG_APPROVED",
  ]) {
    const original = process.env[key];
    delete process.env[key];
    assert.equal(checkoutSettings().ordersOpen, false);
    process.env[key] = original;
  }
  process.env.CHECKOUT_ENABLED = "false";
  assert.equal(checkoutSettings().ordersOpen, false);
  process.env.CHECKOUT_ENABLED = "true";
});

test("every administrator data endpoint independently rejects unauthenticated requests", async () => {
  const context = { params: Promise.resolve({ id: productId }) };
  const responses = await Promise.all([
    adminProductsRoute(request("/api/admin/products")),
    createProductRoute(request("/api/admin/products", {})),
    editProductRoute(
      request("/api/admin/products/" + productId, {}, {}, "PATCH"),
      context,
    ),
    overviewRoute(request("/api/admin/overview")),
    auditRoute(request("/api/admin/audit")),
    detailRoute(request("/api/admin/orders/" + productId), context),
    noteRoute(
      request("/api/admin/orders/" + productId + "/notes", {}),
      context,
    ),
    orderListRoute(request("/api/admin/orders")),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status),
    Array(8).fill(401),
  );
});

test("password-only, wrong authenticator codes and unenrolled admins cannot get application sessions", async () => {
  const loginInput = { email: "mfa-test@example.com", password: "synthetic-password", mfaCode: "123456" };
  const missing = await loginRoute(request("/api/admin/auth/login", { email: loginInput.email, password: loginInput.password }));
  assert.equal(missing.status, 422);
  const invalid = await loginRoute(request("/api/admin/auth/login", { ...loginInput, mfaCode: "000000" }));
  assert.equal(invalid.status, 401);
  assert.equal(invalid.headers.get("set-cookie"), null);
  mfaEnrolled = false;
  try {
    const unenrolled = await loginRoute(request("/api/admin/auth/login", loginInput));
    assert.equal(unenrolled.status, 401);
    assert.equal(unenrolled.headers.get("set-cookie"), null);
  } finally { mfaEnrolled = true; }
  const passwordCookie = { cookie: `ai_admin_session=${passwordToken}` };
  assert.equal((await sessionRoute(request("/api/admin/auth/session", undefined, passwordCookie))).status, 401);
});
