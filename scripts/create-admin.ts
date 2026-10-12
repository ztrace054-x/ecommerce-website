import { createInterface } from "node:readline/promises";
import { requireServerEnv } from "../src/lib/env/server.ts";
import { createDatabase } from "../src/server/database/connection.ts";
import { DataAccessError } from "../src/server/database/errors.ts";
import { createAdminUser } from "../src/server/admin-provisioning.ts";
import { adminCreationSchema } from "../src/server/validators.ts";
import { askPassword } from "./terminal-password.ts";

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Run npm run admin:create in an interactive terminal. Do not pass passwords as arguments or environment variables.");
  }
  if (process.argv.length > 2) throw new Error("This command does not accept credential arguments.");
  const url = requireServerEnv("DATABASE_URL");
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  let email: string;
  try { email = await terminal.question("Admin email: "); } finally { terminal.close(); }
  const password = await askPassword("Password (15–128 characters, hidden): ");
  const confirmation = await askPassword("Confirm password (hidden): ");
  if (password !== confirmation) throw new Error("Passwords do not match. No administrator was created.");
  const result = adminCreationSchema.safeParse({ email, password });
  if (!result.success) throw new Error("Use a valid email and a password of 15–128 characters. No administrator was created.");
  const connection = createDatabase(url);
  try {
    await createAdminUser(result.data, connection.db);
    console.log("Administrator identity created. Login is not implemented; 2FA enrollment is required in Phase 5 before any session.");
  } finally {
    await connection.pool.end();
  }
}

main().catch((error: unknown) => {
  // Only our own safe messages; never the driver or Zod input payload.
  console.error(error instanceof DataAccessError ? error.message :
    error instanceof Error && !error.message.includes("database") ? error.message :
      "Administrator creation failed. Check the private database configuration.");
  process.exitCode = 1;
});
