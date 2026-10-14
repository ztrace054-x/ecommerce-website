import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { mockProducts } from "../src/data/mock-products.ts";

const origin = "http://127.0.0.1:3000";
const root = fileURLToPath(new URL("../", import.meta.url));
// Exercise the closed preview only. These process-local overrides also prevent
// Next.js loading real provider values from any ignored environment file.
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3000"], {
  cwd: root,
  detached: process.platform !== "win32",
  env: {
    ...process.env,
    NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: "", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "",
    TURNSTILE_SECRET_KEY: "", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    CHECKOUT_ENABLED: "false", POLICIES_APPROVED: "false", CATALOG_APPROVED: "false",
    SUPPORT_EMAIL: "", SUPPORT_WHATSAPP_NUMBER: "", APP_URL: origin,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
let startupError = false;
server.on("error", () => { startupError = true; });
server.stdout.on("data", (chunk: Buffer) => { logs = `${logs}${chunk}`.slice(-20_000); });
server.stderr.on("data", (chunk: Buffer) => { logs = `${logs}${chunk}`.slice(-20_000); });

async function stop() {
  if (!server.pid || server.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => server.once("exit", () => resolve()));
  const signal = (value: NodeJS.Signals) => {
    if (server.exitCode !== null || !server.pid) return;
    if (process.platform === "win32") server.kill(value); else process.kill(-server.pid, value);
  };
  signal("SIGTERM");
  const timer = setTimeout(() => signal("SIGKILL"), 5_000);
  try { await exited; } finally { clearTimeout(timer); }
}

async function main() {
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    assert.ok(!startupError && server.exitCode === null && !/EADDRINUSE|already running/iu.test(logs), "Stop other port-3000 servers before production verification.");
    if (logs.includes("Ready")) {
      try { ready = (await fetch(origin, { signal: AbortSignal.timeout(1_000) })).ok; } catch { /* Wait for startup. */ }
      if (ready) break;
    }
    await delay(200);
  }
  assert.ok(ready, "Build with npm run build:next before the production smoke.");
  const paths = ["/", "/products", "/checkout", "/privacy", "/refund", "/terms", "/contact", "/faq", "/track-order", "/admin", "/admin/login",
    ...mockProducts.flatMap((product) => [`/products/${product.slug}`, `/checkout?product=${product.slug}`])];
  const assets = new Set<string>();
  for (const path of paths) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
    assert.equal(response.headers.get("x-frame-options"), "DENY", path);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer", path);
    const html = await response.text();
    assert.ok(html.includes('lang="bn"'), path);
    for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"#]+)"/g)) assets.add(match[1]!);
    if (path.startsWith("/checkout?")) {
      assert.ok(html.includes("অর্ডার এখন বন্ধ"), path);
      assert.ok(!html.includes('name="trxId"'), "Closed checkout cannot collect claims.");
    }
  }
  for (const asset of assets) {
    const response = await fetch(`${origin}${asset}`);
    assert.equal(response.status, 200, asset);
    assert.ok(!response.headers.get("content-type")?.includes("text/html"), "Assets must not resolve to an HTML fallback.");
  }
  assert.equal((await fetch(`${origin}/fonts/noto-sans-bengali.woff2`)).status, 200);
  for (const path of ["/not-a-real-page", "/products/unknown", "/checkout?product=unknown", "/checkout?product=ai-setup&product=prompt-training"]) {
    const response = await fetch(`${origin}${path}`);
    const html = await response.text();
    assert.ok(response.status === 404 || html.includes("পেজটি পাওয়া যায়নি"), path);
    assert.ok(!html.includes('id="customer-name"'), path);
  }
  const tampered = await (await fetch(`${origin}/checkout?product=ai-setup&price=1`)).text();
  assert.ok(tampered.includes("৫০০"), "Query prices must not replace catalog prices.");
  for (const path of ["/api/admin/orders", "/api/admin/products", "/api/admin/overview", "/api/admin/audit"]) {
    assert.equal((await fetch(`${origin}${path}`)).status, 401, path);
  }
  for (const path of ["/api/orders", "/api/orders/quote"]) {
    assert.equal((await fetch(`${origin}${path}`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" })).status, 503, path);
  }
  assert.ok(!/⨯|unhandled|TypeError|ReferenceError/iu.test(logs), "Production server must not log application errors.");
  console.log(`Production smoke passed: ${paths.length} page routes, ${assets.size} static assets, local font, security headers, invalid selectors, protected APIs and closed checkout.`);
}

try { await main(); }
catch (error) { console.error(error instanceof Error ? error.message : "Production smoke failed."); process.exitCode = 1; }
finally { await stop(); }
