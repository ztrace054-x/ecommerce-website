import "server-only";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./connection.ts";

export async function applyMigrations(db: Database): Promise<void> {
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../db/migrations/", import.meta.url)),
  });
}
