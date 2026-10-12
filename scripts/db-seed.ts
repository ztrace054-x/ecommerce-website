import { requireServerEnv } from "../src/lib/env/server.ts";
import { createDatabase, isLoopback, parseDatabaseUrl } from "../src/server/database/connection.ts";
import { seedDemoProducts } from "../src/server/seed.ts";

async function main() {
  const url = requireServerEnv("DATABASE_URL");
  if (!isLoopback(parseDatabaseUrl(url))) throw new Error("Demo seed is restricted to a local database.");
  const connection = createDatabase(url);
  try {
    const count = await seedDemoProducts(connection.db);
    console.log(`Demo seed complete: ${count} new products. No administrators, orders, or voucher codes were created.`);
  } finally {
    await connection.pool.end();
  }
}

main().catch(() => {
  console.error("Demo seed failed. Use a migrated local development database; configuration and credentials are not printed.");
  process.exitCode = 1;
});
