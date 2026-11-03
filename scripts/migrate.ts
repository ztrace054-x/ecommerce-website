import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const client = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  for (const name of ["0001_orders", "0002_tracking", "0003_admin"]) {
  const migration = await readFile(new URL(`../src/db/migrations/${name}.sql`, import.meta.url), "utf8");
  const checksum = createHash("sha256").update(migration).digest("hex");
  await client.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(40010001)`;
    await tx`CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, checksum text NOT NULL)`;
    const rows = await tx`SELECT checksum FROM app_migrations WHERE name = ${name}`;
    if (rows.length) {
      if (rows[0]?.checksum !== checksum) throw new Error("Applied migration checksum mismatch.");
      return;
    }
    await tx.unsafe(migration); // Trusted, checked-in DDL only; never request input.
    await tx`INSERT INTO app_migrations (name, checksum) VALUES (${name}, ${checksum})`;
  });
  }
  console.log("Database migrations complete.");
} catch {
  console.error("Migration failed; inspect configuration and migration history securely.");
  process.exitCode = 1;
} finally { await client.end(); }
