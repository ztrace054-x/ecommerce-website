CREATE TABLE tracking_code_limits (
 code_hash text PRIMARY KEY,
 failures integer NOT NULL DEFAULT 0 CHECK (failures BETWEEN 0 AND 5),
 window_started timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz
);
ALTER TABLE tracking_code_limits ENABLE ROW LEVEL SECURITY;
