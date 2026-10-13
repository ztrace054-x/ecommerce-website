import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const origin = "http://127.0.0.1:3000";
const productId = "10000000-0000-4000-8000-000000000001";
const inactiveId = "10000000-0000-4000-8000-000000000003";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"], {
  cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (chunk: Buffer) => { logs = `${logs}${chunk.toString()}`.slice(-20_000); });
server.stderr.on("data", (chunk: Buffer) => { logs = `${logs}${chunk.toString()}`.slice(-20_000); });
let startupError: Error | undefined;
server.on("error", (error) => { startupError = error; });

async function stop() {
  if (server.exitCode !== null || !server.pid) return;
  const exited = new Promise<void>((resolve) => server.once("exit", () => resolve()));
  if (process.platform === "win32") server.kill("SIGTERM"); else process.kill(-server.pid, "SIGTERM");
  const timer = setTimeout(() => {
    if (server.exitCode === null && server.pid) {
      if (process.platform === "win32") server.kill("SIGKILL"); else process.kill(-server.pid, "SIGKILL");
    }
  }, 5_000);
  try { await exited; } finally { clearTimeout(timer); }
}

async function main() {
  const deadline = Date.now() + 45_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (startupError || server.exitCode !== null || /EADDRINUSE|port 3000 is in use/iu.test(logs)) throw new Error("Development server could not start on default port 3000.");
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(2_000) });
      if (response.ok && (await response.text()).includes("AI সেবা নিন")) { ready = true; break; }
    } catch { /* Wait for Next.js compilation, never suppress the final failure. */ }
    await delay(250);
  }
  assert.ok(ready, "The DB-backed Home page must load on default port 3000.");
  for (const path of ["/", "/products", `/products/${productId}`, `/checkout?product=${productId}`]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const html = await response.text();
    assert.ok(html.includes('lang="bn"'), path);
    assert.ok(html.includes("AI সেটআপ সহায়তা"), path);
    assert.ok(html.includes("৫০০"), "Whole-BDT database price must appear.");
    assert.ok(!html.includes("অফিশিয়াল আমন্ত্রণের নমুনা"), "Inactive products must not be public.");
  }
  for (const path of ["/checkout", "/refund", "/privacy", "/terms", "/contact", "/faq", "/track-order", "/admin", "/admin/login"]) {
    assert.equal((await fetch(`${origin}${path}`)).status, 200, path);
  }
  const tampered = await (await fetch(`${origin}/checkout?product=${productId}&price=1`)).text();
  assert.ok(tampered.includes("৫০০"), "Query prices must be ignored.");
  for (const path of [`/products/${inactiveId}`, "/products/not-a-uuid", `/checkout?product=${productId}&product=${inactiveId}`]) {
    const response = await fetch(`${origin}${path}`);
    const html = await response.text();
    assert.ok(response.status === 404 || html.includes("পেজটি পাওয়া যায়নি"), path);
    assert.ok(!html.includes('id="customer-name"'), "Invalid selectors cannot show checkout fields.");
  }
  for (const path of ["/login", "/track"]) {
    for (const method of ["GET", "POST"]) assert.equal((await fetch(`${origin}${path}`, { method })).status, 404, `${method} ${path}`);
  }
  for (const path of ["/api/admin/orders", "/api/admin/products", "/api/admin/overview", "/api/admin/audit"]) {
    assert.equal((await fetch(`${origin}${path}`)).status, 401, `Protected ${path}`);
  }
  const closed = await fetch(`${origin}/api/orders`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" });
  assert.equal(closed.status, 503, "Unconfigured checkout must refuse claims.");
  assert.ok(!/⨯|unhandled|TypeError|ReferenceError|DataAccessError/iu.test(logs), "Development server must not log application errors.");
  console.log("Development smoke passed: default port, DB products/prices, inactive/invalid selectors, policy/tracking/admin pages, closed checkout and protected APIs.");
}

try { await main(); } catch (error) {
  // Print only assertions from this synthetic smoke, never server log contents.
  console.error(error instanceof Error ? error.message : "Development smoke failed.");
  process.exitCode = 1;
} finally { await stop(); }
