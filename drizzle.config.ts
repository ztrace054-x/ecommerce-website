import { defineConfig } from "drizzle-kit";

// Generation/checking need no database credentials. Apply with db:migrate.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  strict: true,
  verbose: false,
});
