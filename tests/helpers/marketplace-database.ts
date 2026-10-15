import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";

// Apply the real immutable Phase 2 history before the additive continuation.
export async function migrateMarketplace(db: PGlite) {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;");
  const journal = JSON.parse(readFileSync(new URL("../../src/db/migrations/meta/_journal.json", import.meta.url), "utf8")) as { entries: { tag: string }[] };
  for (const { tag } of journal.entries) {
    await db.exec(readFileSync(new URL(`../../src/db/migrations/${tag}.sql`, import.meta.url), "utf8"));
  }
}
// Shape-only synthetic fixture, never an actual login credential or seed default.
const syntheticHash = "scrypt-v1$131072$8$1$" + "a".repeat(43) + "$" + "b".repeat(86);
export async function seedMarketplaceAdmin(db: PGlite, id: string, providerId: string, active = true) {
  await db.query("INSERT INTO public.admin_users(id,email,password_hash,auth_user_id,is_active) VALUES($1,$2,$3,$4,$5)",
    [id, `${id}@example.com`, syntheticHash, providerId, active]);
}
export async function seedMarketplaceProduct(db: PGlite, id: string) {
  await db.query("INSERT INTO public.products(id,name,description,price_bdt,delivery_type,is_active,storefront_slug) VALUES($1,'Synthetic Service','Synthetic description',500,'C',true,'synthetic-service')", [id]);
}
