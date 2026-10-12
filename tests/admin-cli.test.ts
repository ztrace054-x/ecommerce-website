import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { adminUsers } from "../src/db/schema.ts";
import { applyMigrations } from "../src/server/database/migrations.ts";
import { verifyPassword } from "../src/server/security/password.ts";
import { connectTestDatabase, testDatabaseUrl } from "./helpers/database.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const { db, pool } = connectTestDatabase();
const email = "cli-fixture@example.com";
const password = "SYNTHETIC-cli-passphrase-only";
const env = { ...process.env, DATABASE_URL: testDatabaseUrl() };
const cli = ["--conditions=react-server", "scripts/create-admin.ts"];

before(async () => {
  await applyMigrations(db);
  await db.delete(adminUsers).where(eq(adminUsers.email, email));
});
after(async () => {
  try { await db.delete(adminUsers).where(eq(adminUsers.email, email)); } finally { await pool.end(); }
});

test("admin creation rejects piped credentials", () => {
  const result = spawnSync(process.execPath, cli, { cwd: root, env, input: `${email}\n${password}\n`, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /interactive terminal/u);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(password));
});

async function runTerminal(command = "node --conditions=react-server scripts/create-admin.ts", confirmation = password) {
  // Linux/macOS CI uses util-linux script to give the actual CLI a pseudo-terminal.
  // No credentials appear in command-line arguments or shell history.
  const child = spawn("script", ["-q", "-e", "-c", command, "/dev/null"], {
    cwd: root, env, stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  let stage = 0;
  const timeout = setTimeout(() => child.kill("SIGKILL"), 20_000);
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
    if (stage === 0 && output.includes("Admin email: ")) {
      stage = 1; child.stdin.write(`${email}\n`);
    } else if (stage === 1 && output.includes("characters, hidden): ")) {
      stage = 2; child.stdin.write(`${password}\n`);
    } else if (stage === 2 && output.includes("Confirm password (hidden): ")) {
      stage = 3; child.stdin.write(`${confirmation}\n`);
    }
  });
  child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.on("error", reject); child.on("close", resolve);
    });
    assert.ok(!output.includes(password), "Neither password entry may echo to the terminal.");
    assert.ok(!output.includes(confirmation));
    return { code, output, stage };
  } finally {
    clearTimeout(timeout);
    child.stdin.end();
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

test("interactive admin script rejects credential arguments before asking for input", async () => {
  const result = await runTerminal("node --conditions=react-server scripts/create-admin.ts --synthetic-argument");
  assert.equal(result.code, 1);
  assert.equal(result.stage, 0);
  assert.match(result.output, /does not accept credential arguments/u);
});

test("mismatched terminal confirmation leaves no administrator record", async () => {
  const result = await runTerminal(undefined, "SYNTHETIC-different-confirmation");
  assert.equal(result.code, 1);
  assert.equal(result.stage, 3);
  assert.match(result.output, /do not match/u);
  assert.equal((await db.select().from(adminUsers).where(eq(adminUsers.email, email))).length, 0);
});

test("interactive admin script hides password and confirmation and stores the verified salted hash", async () => {
  const result = await runTerminal();
  assert.equal(result.code, 0);
  assert.equal(result.stage, 3);
  assert.match(result.output, /identity created/u);
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  assert.ok(admin);
  assert.equal(admin.totpSecretEncrypted, null);
  assert.equal(await verifyPassword(password, admin.passwordHash), true);
});
