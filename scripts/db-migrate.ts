import { requireServerEnv } from "../src/lib/env/server.ts";
import { createDatabase } from "../src/server/database/connection.ts";
import { applyMigrations } from "../src/server/database/migrations.ts";

async function main() {
  const connection = createDatabase(process.env.MIGRATION_DATABASE_URL?.trim() || requireServerEnv("DATABASE_URL"));
  try {
    await applyMigrations(connection.db);
    console.log("Database migrations applied successfully.");
  } finally {
    await connection.pool.end();
  }
}

main().catch(() => {
  console.error("Database migration failed. Check the private connection configuration and database availability. No credentials are printed.");
  process.exitCode = 1;
});
