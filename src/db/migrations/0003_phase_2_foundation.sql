ALTER TABLE "admin_users" ADD COLUMN "role" text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currency" varchar(3) DEFAULT 'BDT' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" text GENERATED ALWAYS AS (CASE
    WHEN status = 'pending' THEN 'unpaid'
    WHEN status = 'submitted' THEN 'submitted'
    WHEN status = 'rejected' THEN 'rejected'
    WHEN status = 'refunded' THEN 'refunded'
    ELSE 'verified' END) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "currency" varchar(3) DEFAULT 'BDT' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text GENERATED ALWAYS AS (coalesce(nullif(btrim(storefront_metadata->>'category'), ''), 'সেবা')) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_valid" CHECK ("admin_users"."role" IN ('admin', 'support'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_bdt" CHECK ("orders"."currency" = 'BDT');--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_currency_bdt" CHECK ("products"."currency" = 'BDT');--> statement-breakpoint
CREATE VIEW "public"."payment_claims" WITH (security_barrier = true, security_invoker = true) AS (
  SELECT o.id AS order_id, o.trx_id, o.sender_bkash_number, o.submitted_at,
    o.payment_status AS verification_status, o.verified_at,
    review.admin_id AS reviewed_by, review.created_at AS reviewed_at,
    review.id AS review_audit_id
  FROM public.orders o
  LEFT JOIN LATERAL (
    SELECT a.id, a.admin_id, a.created_at FROM public.audit_logs a
    WHERE a.order_id = o.id AND (
      (o.status IN ('verified', 'delivered', 'refunded') AND a.action = 'order.verified')
      OR (o.status = 'rejected' AND a.action = 'order.rejected')
    )
    ORDER BY a.created_at DESC, a.id DESC LIMIT 1
  ) review ON true
  WHERE o.trx_id IS NOT NULL
);
--> statement-breakpoint
-- A view must not inherit provider default grants or the owner's RLS bypass.
REVOKE ALL ON public.payment_claims FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON public.payment_claims FROM %I', r);
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON public.payment_claims TO service_role;
  END IF;
END $$;
--> statement-breakpoint
-- Keep existing provider/MFA/session architecture. A reserved support identity
-- has no admin capability until a later migration defines scoped permissions.
CREATE OR REPLACE FUNCTION public.ai_require_admin(p_actor uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE id=p_actor AND is_active
    AND role='admin' AND (locked_until IS NULL OR locked_until<=now())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.ai_open_admin_session(p_actor uuid,p_token_hash text,p_expires_at timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_actor uuid;
BEGIN
  SELECT id INTO v_actor FROM public.admin_users WHERE auth_user_id=p_actor
    AND is_active AND role='admin' AND (locked_until IS NULL OR locked_until<=now());
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_expires_at<=now() OR p_expires_at>now()+interval '1 hour 1 minute' THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.ai_admin_sessions(token_hash,admin_id,expires_at) VALUES(p_token_hash,v_actor,p_expires_at);
  INSERT INTO public.audit_logs(admin_id,action) VALUES(v_actor,'admin.login');
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.ai_get_admin_session(p_token_hash text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT jsonb_build_object('id',a.id,'authUserId',a.auth_user_id,'email',a.email,'expiresAt',s.expires_at)
  FROM public.ai_admin_sessions s JOIN public.admin_users a ON a.id=s.admin_id
  WHERE s.token_hash=p_token_hash AND s.revoked_at IS NULL AND s.expires_at>now()
    AND a.is_active AND a.role='admin' AND (a.locked_until IS NULL OR a.locked_until<=now());
$$;
-- CREATE OR REPLACE preserves the existing restricted function grants.
