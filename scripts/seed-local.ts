import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url || process.env.NODE_ENV === "production" || process.env.ALLOW_LOCAL_SEED !== "1" || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  throw new Error("Seed requires an explicitly enabled local development database.");
}
const client = postgres(url, { max: 1 });
try {
  await client`INSERT INTO products (id, slug, name, description, price_bdt, delivery_type, is_active) VALUES
    ('00000000-0000-4000-8000-000000000001', 'ai-setup', 'Local sample setup', 'Synthetic development product', 500, 'C', true),
    ('00000000-0000-4000-8000-000000000002', 'prompt-training', 'Local sample training', 'Synthetic development product', 750, 'C', true)
    ON CONFLICT DO NOTHING`;
  console.log("Local sample products seeded.");
} finally { await client.end(); }
