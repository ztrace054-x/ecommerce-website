import "server-only";
import { readFileSync } from "node:fs";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { z } from "zod";
import { requireServerEnv } from "../../lib/env/server.ts";
import * as schema from "../../db/schema.ts";

export type Database = NodePgDatabase<typeof schema>;

export function parseDatabaseUrl(value: string): URL {
  try {
    const url = new URL(z.string().min(1).max(8192).parse(value));
    if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname || !url.username || !/^\/[A-Za-z0-9_-]+$/u.test(url.pathname) ||
      url.hash || value !== value.trim()) throw new Error();
    for (const key of url.searchParams.keys()) {
      if (!["sslmode", "sslrootcert"].includes(key) || url.searchParams.getAll(key).length !== 1) throw new Error();
    }
    return url;
  } catch {
    throw new Error("Invalid database URL configuration. Use a PostgreSQL connection URL; credentials are not shown.");
  }
}

export function isLoopback(url: URL): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

export function databasePoolConfig(value: string): PoolConfig {
  const url = parseDatabaseUrl(value);
  const local = isLoopback(url);
  const mode = url.searchParams.get("sslmode");
  if (mode && mode !== "verify-full" && !(local && mode === "disable")) {
    throw new Error("Database TLS must verify the server. Only loopback development may disable TLS.");
  }
  const caPath = url.searchParams.get("sslrootcert");
  let ca: string | undefined;
  if (caPath) {
    try {
      const contents = readFileSync(caPath, "utf8");
      if (contents.length > 1_048_576 || !contents.includes("-----BEGIN CERTIFICATE-----")) throw new Error();
      ca = contents;
    } catch {
      throw new Error("Database CA certificate could not be read.");
    }
  }
  // pg connection-string TLS options can override Pool.ssl; remove them first.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");
  return {
    connectionString: url.toString(),
    ssl: local && mode !== "verify-full" ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: process.env.NODE_ENV === "production" ? 1 : 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    statement_timeout: 10_000,
    application_name: "ai-services",
  };
}

export function createDatabase(value: string) {
  const pool = new Pool(databasePoolConfig(value));
  // Prevent unhandled idle-client errors and redact all connection details.
  pool.on("error", () => console.error("Database connection interrupted."));
  return { db: drizzle(pool, { schema }), pool };
}

const globalDatabase = globalThis as typeof globalThis & {
  ecommerceDatabase?: ReturnType<typeof createDatabase>;
};

/** Lazy connection: builds need no running database or real configuration. */
export function getDatabase(): Database {
  globalDatabase.ecommerceDatabase ??= createDatabase(requireServerEnv("DATABASE_URL"));
  return globalDatabase.ecommerceDatabase.db;
}
