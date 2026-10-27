CREATE TABLE products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE,
 name text NOT NULL,
 description text NOT NULL,
 price_bdt integer NOT NULL CHECK (price_bdt > 0),
 delivery_type text NOT NULL CHECK (delivery_type IN ('A','B','C')),
 is_active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_code text NOT NULL CONSTRAINT orders_order_code_unique UNIQUE,
 product_id uuid NOT NULL REFERENCES products(id),
 customer_name text NOT NULL,
 customer_email text NOT NULL,
 whatsapp text,
 sender_bkash_number text NOT NULL,
 trx_id text NOT NULL CONSTRAINT orders_trx_id_unique UNIQUE,
 amount_expected integer NOT NULL CHECK (amount_expected > 0),
 status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','verified','delivered','rejected','refunded')),
 created_at timestamptz NOT NULL DEFAULT now(),
 verified_at timestamptz,
 delivered_at timestamptz,
 admin_note text,
 client_ip_hash text,
 CONSTRAINT orders_trx_id_normalized CHECK (trx_id = upper(regexp_replace(trx_id, '\s', '', 'g')))
);
-- The UNIQUE constraint already provides the order_code index.
CREATE INDEX orders_created_at_idx ON orders(created_at);
CREATE INDEX orders_status_idx ON orders(status);
CREATE TABLE audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 admin_id uuid,
 action text NOT NULL,
 order_id uuid REFERENCES orders(id),
 order_code text,
 ip_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_rate_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 ip_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_rate_events_ip_time_idx ON order_rate_events(ip_hash, created_at);
-- No direct browser/anonymous access, including when hosted on Supabase.
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_rate_events ENABLE ROW LEVEL SECURITY;
