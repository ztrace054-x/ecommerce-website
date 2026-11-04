ALTER TABLE products ADD COLUMN delivery_instructions text NOT NULL DEFAULT '' CHECK (length(delivery_instructions) <= 4000);
ALTER TABLE orders ADD COLUMN delivery_channel text CHECK (delivery_channel IN ('email','whatsapp'));
ALTER TABLE orders ADD COLUMN delivery_sent_to text;
ALTER TABLE orders ADD COLUMN delivery_email_attempts integer NOT NULL DEFAULT 0 CHECK (delivery_email_attempts BETWEEN 0 AND 3);
ALTER TABLE orders ADD COLUMN delivery_email_sent_at timestamptz;
CREATE TABLE delivery_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES products(id),
 code_encrypted text NOT NULL,
 encryption_iv bytea NOT NULL UNIQUE CHECK (octet_length(encryption_iv)=12),
 code_fingerprint text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','delivered','void')),
 order_id uuid UNIQUE REFERENCES orders(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 reserved_at timestamptz,
 delivered_at timestamptz,
 added_by uuid NOT NULL REFERENCES admin_users(id),
 void_reason text,
 CHECK (
  (status='available' AND order_id IS NULL AND reserved_at IS NULL AND delivered_at IS NULL) OR
  (status='reserved' AND order_id IS NOT NULL AND reserved_at IS NOT NULL AND delivered_at IS NULL) OR
  (status='delivered' AND order_id IS NOT NULL AND reserved_at IS NOT NULL AND delivered_at IS NOT NULL) OR
  (status='void' AND order_id IS NULL)
 )
);
CREATE INDEX delivery_codes_stock_idx ON delivery_codes(product_id,status,created_at);
CREATE TABLE delivery_email_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES orders(id),
 attempted_by uuid NOT NULL REFERENCES admin_users(id),
 attempted_at timestamptz NOT NULL DEFAULT now(),
 succeeded boolean NOT NULL DEFAULT false
);
CREATE INDEX delivery_email_attempts_order_idx ON delivery_email_attempts(order_id,attempted_at);
ALTER TABLE delivery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_email_attempts ENABLE ROW LEVEL SECURITY;
