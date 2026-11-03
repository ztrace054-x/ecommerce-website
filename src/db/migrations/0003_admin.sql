CREATE TABLE admin_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE CHECK (email = lower(email)),
 password_hash text NOT NULL,
 totp_secret_encrypted text NOT NULL,
 totp_enabled boolean NOT NULL DEFAULT true,
 failed_login_count integer NOT NULL DEFAULT 0,
 locked_until timestamptz,
 last_totp_step bigint NOT NULL DEFAULT -1,
 last_login_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_sessions (
 id text PRIMARY KEY,
 admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
 csrf_hash text NOT NULL,
 authenticated boolean NOT NULL DEFAULT false,
 expires_at timestamptz NOT NULL,
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 ip_hash text NOT NULL,
 user_agent_hash text NOT NULL
);
CREATE INDEX admin_sessions_admin_idx ON admin_sessions(admin_id);
CREATE TABLE admin_recovery_codes (
 admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
 code_hash text NOT NULL,
 used_at timestamptz,
 PRIMARY KEY (admin_id, code_hash)
);
ALTER TABLE orders ADD COLUMN verified_by uuid REFERENCES admin_users(id);
ALTER TABLE orders ADD COLUMN rejected_reason text;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_recovery_codes ENABLE ROW LEVEL SECURITY;
-- Any verified attribution must have a timestamp; transition enforcement also
-- belongs to the transaction holding the order row lock in the admin service.
ALTER TABLE orders ADD CONSTRAINT orders_verification_attribution CHECK (verified_by IS NULL OR verified_at IS NOT NULL);
CREATE FUNCTION enforce_order_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status <> OLD.status AND NOT (
   (OLD.status = 'submitted' AND NEW.status IN ('verified','rejected')) OR
   (OLD.status = 'verified' AND NEW.status IN ('delivered','refunded')) OR
   (OLD.status = 'rejected' AND NEW.status = 'refunded')
 ) THEN RAISE EXCEPTION 'Invalid order transition' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER orders_transition BEFORE UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION enforce_order_transition();
