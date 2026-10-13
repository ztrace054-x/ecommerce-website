-- Additive continuation. Original Phase 2 migrations remain immutable.
CREATE TABLE "ai_admin_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"admin_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_admin_sessions_token_format" CHECK ("ai_admin_sessions"."token_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "ai_admin_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_checkout_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_code" text NOT NULL,
	"token_hash" text NOT NULL,
	"product_id" uuid NOT NULL,
	"product_snapshot" jsonb NOT NULL,
	"amount_poisha" integer NOT NULL,
	"bkash_recipient" text NOT NULL,
	"payment_method" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_checkout_sessions_order_code_unique" UNIQUE("order_code"),
	CONSTRAINT "ai_checkout_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "ai_checkout_sessions_code_format" CHECK ("ai_checkout_sessions"."order_code" ~ '^ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$'),
	CONSTRAINT "ai_checkout_sessions_token_format" CHECK ("ai_checkout_sessions"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "ai_checkout_sessions_amount_valid" CHECK ("ai_checkout_sessions"."amount_poisha" > 0 AND "ai_checkout_sessions"."amount_poisha" <= 100000000 AND "ai_checkout_sessions"."amount_poisha" % 100 = 0),
	CONSTRAINT "ai_checkout_sessions_recipient_format" CHECK ("ai_checkout_sessions"."bkash_recipient" ~ '^01[3-9][0-9]{8}$'),
	CONSTRAINT "ai_checkout_sessions_method_valid" CHECK ("ai_checkout_sessions"."payment_method" IN ('payment','send_money'))
);
--> statement-breakpoint
ALTER TABLE "ai_checkout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_order_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_order_notes_length" CHECK (length("ai_order_notes"."note") BETWEEN 1 AND 2000)
);
--> statement-breakpoint
ALTER TABLE "ai_order_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "ai_rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start"),
	CONSTRAINT "ai_rate_limits_hits_positive" CHECK ("ai_rate_limits"."hits" > 0)
);
--> statement-breakpoint
ALTER TABLE "ai_rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "ip" SET DEFAULT '0.0.0.0';--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "target_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "details" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_session_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "product_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_token_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claim_fingerprint" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_message" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "storefront_slug" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "storefront_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_admin_sessions" ADD CONSTRAINT "ai_admin_sessions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_checkout_sessions" ADD CONSTRAINT "ai_checkout_sessions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_order_notes" ADD CONSTRAINT "ai_order_notes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_order_notes" ADD CONSTRAINT "ai_order_notes_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_ai_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."ai_checkout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_auth_user_id_unique" UNIQUE("auth_user_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_unique" UNIQUE("checkout_session_id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_storefront_slug_unique" UNIQUE("storefront_slug");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tracking_token_format" CHECK ("orders"."tracking_token_hash" IS NULL OR "orders"."tracking_token_hash" ~ '^[a-f0-9]{64}$');--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_claim_fingerprint_format" CHECK ("orders"."claim_fingerprint" IS NULL OR "orders"."claim_fingerprint" ~ '^[a-f0-9]{64}$');--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_version_positive" CHECK ("orders"."version" > 0);
--> statement-breakpoint
-- RPCs extend the existing Phase 2 tables. Every call executes with the caller's
-- restricted database privileges; the web server alone holds the service key.
REVOKE ALL ON public.products, public.orders, public.admin_users, public.audit_logs,
 public.ai_checkout_sessions, public.ai_admin_sessions, public.ai_order_notes,
 public.ai_rate_limits FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON public.products, public.orders, public.admin_users, public.audit_logs, public.delivery_codes, public.ai_checkout_sessions, public.ai_admin_sessions, public.ai_order_notes, public.ai_rate_limits FROM %I',r);
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  GRANT SELECT,INSERT,UPDATE ON public.products,public.orders,public.ai_checkout_sessions,public.ai_admin_sessions,public.ai_rate_limits TO service_role;
  GRANT SELECT ON public.admin_users TO service_role;
  GRANT SELECT,INSERT ON public.audit_logs,public.ai_order_notes TO service_role;
 END IF;
END $$;

CREATE FUNCTION public.ai_product_json(p public.products) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',p.id,'slug',coalesce(p.storefront_slug,p.id::text),
  'name',p.name,'description',p.description,'pricePoisha',p.price_bdt::bigint*100,
  'active',p.is_active,'deliveryType','service','category',coalesce(p.storefront_metadata->>'category','সেবা'),
  'unit',coalesce(p.storefront_metadata->>'unit','একটি সেবা'),
  'duration',coalesce(p.storefront_metadata->>'duration','সময় আগে আলোচনা করা হবে'),
  'icon',coalesce(p.storefront_metadata->>'icon','setup'),
  'includes',coalesce(p.storefront_metadata->'includes','["কাজের পরিধি আগে আলোচনা করা হবে","কোনো পাসওয়ার্ড দিতে হবে না"]'::jsonb),
  'deliveryMethod',coalesce(p.storefront_metadata->>'deliveryMethod','অনলাইনে'),
  'deliveryNote',coalesce(p.storefront_metadata->>'deliveryNote','পেমেন্ট হাতে যাচাইয়ের পরে নির্বাচিত সেবা দেওয়া হবে।'),
  'terms',coalesce(p.storefront_metadata->>'terms','অর্ডারের আগে কাজের পরিধি ও ডেলিভারি নিশ্চিত করুন।'));
$$;
CREATE FUNCTION public.ai_catalog() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(public.ai_product_json(p) ORDER BY p.created_at,p.id),'[]'::jsonb)
 FROM public.products p WHERE p.is_active AND p.delivery_type='C';
$$;
CREATE FUNCTION public.ai_order_json(o public.orders) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',o.id,'orderCode',o.order_code,'productId',o.product_id,
  'productName',coalesce(o.product_snapshot->>'name',(SELECT name FROM public.products WHERE id=o.product_id)),
  'amountPoisha',o.amount_expected::bigint*100,'status',o.status,'customerName',o.customer_name,
  'customerEmail',o.customer_email,'whatsapp',o.whatsapp,'bkashSender',o.sender_bkash_number,
  'trxId',o.trx_id,'version',o.version,'createdAt',o.created_at,'updatedAt',o.updated_at,
  'verifiedAt',o.verified_at,'deliveredAt',o.delivered_at,'customerMessage',o.customer_message);
$$;
CREATE FUNCTION public.ai_require_admin(p_actor uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE id=p_actor AND is_active AND (locked_until IS NULL OR locked_until<=now())) THEN
  RAISE EXCEPTION 'forbidden';
 END IF;
END $$;
CREATE FUNCTION public.ai_take_rate_limit(p_key text,p_limit integer,p_window_seconds integer) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_start timestamptz; v_hits integer;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 1000 OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION 'forbidden'; END IF;
 v_start:=to_timestamp(floor(extract(epoch FROM clock_timestamp())/p_window_seconds)*p_window_seconds);
 INSERT INTO public.ai_rate_limits(key,window_start,hits) VALUES(p_key,v_start,1)
 ON CONFLICT(key,window_start) DO UPDATE SET hits=public.ai_rate_limits.hits+1 RETURNING hits INTO v_hits;
 RETURN v_hits<=p_limit;
END $$;
CREATE FUNCTION public.ai_create_quote(p_id uuid,p_order_code text,p_token_hash text,p_product_id uuid,p_recipient text,p_method text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_product public.products; v_expires timestamptz:=now()+interval '24 hours';
BEGIN
 SELECT * INTO v_product FROM public.products WHERE id=p_product_id AND is_active AND delivery_type='C' AND price_bdt<=1000000 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'product_unavailable'; END IF;
 INSERT INTO public.ai_checkout_sessions(id,order_code,token_hash,product_id,product_snapshot,amount_poisha,bkash_recipient,payment_method,expires_at)
 VALUES(p_id,p_order_code,p_token_hash,p_product_id,public.ai_product_json(v_product),v_product.price_bdt*100,p_recipient,p_method,v_expires);
 RETURN jsonb_build_object('orderCode',p_order_code,'product',public.ai_product_json(v_product),
  'amountPoisha',v_product.price_bdt*100,'expiresAt',v_expires,'recipient',p_recipient,'paymentMethod',p_method);
END $$;
CREATE FUNCTION public.ai_submit_order(p_token_hash text,p_customer_name text,p_customer_email text,p_bkash_sender text,p_whatsapp text,p_trx_id text,p_fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_session public.ai_checkout_sessions; v_order public.orders;
BEGIN
 SELECT * INTO v_session FROM public.ai_checkout_sessions WHERE token_hash=p_token_hash FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'quote_invalid'; END IF;
 SELECT * INTO v_order FROM public.orders WHERE checkout_session_id=v_session.id;
 IF FOUND THEN
  IF v_order.claim_fingerprint IS DISTINCT FROM p_fingerprint THEN RAISE EXCEPTION 'claim_conflict'; END IF;
  RETURN jsonb_build_object('orderCode',v_order.order_code,'status',v_order.status);
 END IF;
 IF v_session.expires_at<=now() THEN RAISE EXCEPTION 'quote_expired'; END IF;
 -- An already issued quote remains claimable after unpublishing: the customer
 -- may have paid. Product updates never rewrite the quoted price or terms.
 INSERT INTO public.orders(checkout_session_id,order_code,product_id,product_snapshot,amount_expected,
  customer_name,customer_email,sender_bkash_number,whatsapp,trx_id,tracking_token_hash,claim_fingerprint,submitted_at,status)
 VALUES(v_session.id,v_session.order_code,v_session.product_id,v_session.product_snapshot,v_session.amount_poisha/100,
  p_customer_name,lower(p_customer_email),p_bkash_sender,nullif(p_whatsapp,''),upper(p_trx_id),p_token_hash,p_fingerprint,now(),'submitted')
 RETURNING * INTO v_order;
 UPDATE public.ai_checkout_sessions SET submitted_at=now() WHERE id=v_session.id;
 RETURN jsonb_build_object('orderCode',v_order.order_code,'status',v_order.status);
END $$;
CREATE FUNCTION public.ai_track_order(p_order_code text,p_email text,p_token_hash text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('orderCode',o.order_code,'productName',o.product_snapshot->>'name',
  'amountPoisha',o.amount_expected::bigint*100,'status',o.status,'createdAt',o.created_at,'updatedAt',o.updated_at,
  'verifiedAt',o.verified_at,'deliveredAt',o.delivered_at,'customerMessage',o.customer_message)
 FROM public.orders o WHERE o.order_code=p_order_code AND o.customer_email=lower(p_email) AND o.tracking_token_hash=p_token_hash;
$$;
CREATE FUNCTION public.ai_open_admin_session(p_actor uuid,p_token_hash text,p_expires_at timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_actor uuid;
BEGIN
 SELECT id INTO v_actor FROM public.admin_users WHERE auth_user_id=p_actor AND is_active AND (locked_until IS NULL OR locked_until<=now());
 IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_expires_at<=now() OR p_expires_at>now()+interval '1 hour 1 minute' THEN RAISE EXCEPTION 'forbidden'; END IF;
 INSERT INTO public.ai_admin_sessions(token_hash,admin_id,expires_at) VALUES(p_token_hash,v_actor,p_expires_at);
 INSERT INTO public.audit_logs(admin_id,action) VALUES(v_actor,'admin.login');
END $$;
CREATE FUNCTION public.ai_get_admin_session(p_token_hash text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',a.id,'authUserId',a.auth_user_id,'email',a.email,'expiresAt',s.expires_at)
 FROM public.ai_admin_sessions s JOIN public.admin_users a ON a.id=s.admin_id
 WHERE s.token_hash=p_token_hash AND s.revoked_at IS NULL AND s.expires_at>now() AND a.is_active AND (a.locked_until IS NULL OR a.locked_until<=now());
$$;
CREATE FUNCTION public.ai_close_admin_session(p_token_hash text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_actor uuid;
BEGIN
 UPDATE public.ai_admin_sessions SET revoked_at=now() WHERE token_hash=p_token_hash AND revoked_at IS NULL RETURNING admin_id INTO v_actor;
 IF FOUND THEN INSERT INTO public.audit_logs(admin_id,action) VALUES(v_actor,'admin.logout'); END IF;
END $$;
CREATE FUNCTION public.ai_admin_overview(p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_result jsonb;
BEGIN
 PERFORM public.ai_require_admin(p_actor);
 SELECT jsonb_build_object('total',count(*),'submitted',count(*) FILTER(WHERE status='submitted'),
  'verified',count(*) FILTER(WHERE status='verified'),'delivered',count(*) FILTER(WHERE status='delivered'),
  'rejected',count(*) FILTER(WHERE status='rejected'),
  'deliveredPoisha',coalesce(sum(amount_expected::bigint*100) FILTER(WHERE status='delivered'),0)) INTO v_result FROM public.orders;
 RETURN v_result;
END $$;
CREATE FUNCTION public.ai_admin_list_orders(p_actor uuid,p_query text,p_status text,p_page integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_rows jsonb; v_total integer;
BEGIN
 PERFORM public.ai_require_admin(p_actor);
 IF p_page NOT BETWEEN 1 AND 10000 OR length(p_query)>100 THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT count(*) INTO v_total FROM public.orders o WHERE (p_status IS NULL OR o.status::text=p_status)
  AND (p_query='' OR position(lower(p_query) IN lower(o.order_code||' '||o.customer_name||' '||o.customer_email||' '||coalesce(o.trx_id,'')))>0);
 SELECT coalesce(jsonb_agg(public.ai_order_json(s) ORDER BY s.created_at DESC,s.id DESC),'[]'::jsonb) INTO v_rows FROM (
  SELECT * FROM public.orders o WHERE (p_status IS NULL OR o.status::text=p_status)
   AND (p_query='' OR position(lower(p_query) IN lower(o.order_code||' '||o.customer_name||' '||o.customer_email||' '||coalesce(o.trx_id,'')))>0)
  ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET(p_page-1)*25
 ) s;
 RETURN jsonb_build_object('orders',v_rows,'total',v_total,'page',p_page);
END $$;
CREATE FUNCTION public.ai_admin_order_detail(p_actor uuid,p_order_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_order public.orders; v_notes jsonb; v_audit jsonb;
BEGIN
 PERFORM public.ai_require_admin(p_actor);
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'note',note,'actorId',admin_id,'createdAt',created_at) ORDER BY created_at DESC),'[]'::jsonb)
 INTO v_notes FROM public.ai_order_notes WHERE order_id=p_order_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'action',action,'actorId',admin_id,'details',details,'createdAt',created_at) ORDER BY created_at DESC),'[]'::jsonb)
 INTO v_audit FROM public.audit_logs WHERE target_id=p_order_id OR order_id=p_order_id;
 IF v_order.submitted_at IS NOT NULL THEN
  v_audit:=v_audit||jsonb_build_array(jsonb_build_object('id',v_order.id,'action','order.submitted','actorId',null,'details',jsonb_build_object('status','submitted'),'createdAt',v_order.submitted_at));
 END IF;
 RETURN jsonb_build_object('order',public.ai_order_json(v_order)||jsonb_build_object(
  'productSnapshot',v_order.product_snapshot,'legacyAdminNote',v_order.admin_note,
  'bkashRecipient',(SELECT bkash_recipient FROM public.ai_checkout_sessions WHERE id=v_order.checkout_session_id),
  'paymentMethod',(SELECT payment_method FROM public.ai_checkout_sessions WHERE id=v_order.checkout_session_id)),
  'notes',v_notes,'audit',v_audit);
END $$;
CREATE FUNCTION public.ai_admin_update_order(p_actor uuid,p_order_id uuid,p_status text,p_expected_version integer,p_note text,p_customer_message text,p_verified_amount integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_order public.orders; v_from text;
BEGIN
 PERFORM public.ai_require_admin(p_actor);
 IF length(p_note) NOT BETWEEN 1 AND 2000 OR length(p_customer_message)>1000 THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
 IF v_order.version<>p_expected_version THEN RAISE EXCEPTION 'stale_order'; END IF;
 IF NOT ((v_order.status='submitted' AND p_status IN ('verified','rejected')) OR (v_order.status='verified' AND p_status='delivered')) THEN RAISE EXCEPTION 'invalid_transition'; END IF;
 IF p_status='verified' AND (p_verified_amount IS NULL OR p_verified_amount<>v_order.amount_expected*100) THEN RAISE EXCEPTION 'amount_mismatch'; END IF;
 IF p_status='rejected' AND length(p_customer_message)<3 THEN RAISE EXCEPTION 'forbidden'; END IF;
 v_from:=v_order.status;
 UPDATE public.orders SET status=p_status::public.order_status,version=version+1,customer_message=p_customer_message,updated_at=now(),
  verified_at=CASE WHEN p_status='verified' THEN now() ELSE verified_at END,
  delivered_at=CASE WHEN p_status='delivered' THEN now() ELSE delivered_at END
 WHERE id=p_order_id RETURNING * INTO v_order;
 INSERT INTO public.ai_order_notes(order_id,admin_id,note) VALUES(p_order_id,p_actor,p_note);
 INSERT INTO public.audit_logs(admin_id,action,target_id,order_id,details)
 VALUES(p_actor,'order.'||p_status,p_order_id,p_order_id,jsonb_build_object('from',v_from,'to',p_status,'version',v_order.version));
 RETURN public.ai_order_json(v_order);
END $$;
CREATE FUNCTION public.ai_admin_add_note(p_actor uuid,p_order_id uuid,p_note text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM public.ai_require_admin(p_actor);
 IF length(p_note) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=p_order_id) THEN RAISE EXCEPTION 'not_found'; END IF;
 INSERT INTO public.ai_order_notes(order_id,admin_id,note) VALUES(p_order_id,p_actor,p_note);
 INSERT INTO public.audit_logs(admin_id,action,target_id,order_id) VALUES(p_actor,'note.added',p_order_id,p_order_id);
END $$;
CREATE FUNCTION public.ai_admin_products(p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_result jsonb;
BEGIN
 PERFORM public.ai_require_admin(p_actor);
 SELECT coalesce(jsonb_agg(public.ai_product_json(p) ORDER BY p.created_at,p.id),'[]'::jsonb) INTO v_result FROM public.products p WHERE delivery_type='C';
 RETURN v_result;
END $$;
CREATE FUNCTION public.ai_admin_save_product(p_actor uuid,p_id uuid,p_product jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_product public.products; v_action text;
BEGIN
 PERFORM public.ai_require_admin(p_actor);
 IF (p_product->>'pricePoisha')::integer % 100<>0 THEN RAISE EXCEPTION 'amount_mismatch'; END IF;
 IF p_id IS NULL THEN
  INSERT INTO public.products(name,description,price_bdt,delivery_type,is_active,storefront_slug,storefront_metadata)
  VALUES(p_product->>'name',p_product->>'description',(p_product->>'pricePoisha')::integer/100,'C',(p_product->>'active')::boolean,p_product->>'slug',p_product) RETURNING * INTO v_product;
  v_action:='product.created';
 ELSE
  UPDATE public.products SET name=p_product->>'name',description=p_product->>'description',price_bdt=(p_product->>'pricePoisha')::integer/100,
   is_active=(p_product->>'active')::boolean,storefront_slug=p_product->>'slug',storefront_metadata=p_product,updated_at=now()
  WHERE id=p_id AND delivery_type='C' RETURNING * INTO v_product;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  v_action:='product.updated';
 END IF;
 INSERT INTO public.audit_logs(admin_id,action,target_id,details) VALUES(p_actor,v_action,v_product.id,
  jsonb_build_object('pricePoisha',v_product.price_bdt*100,'active',v_product.is_active));
 RETURN public.ai_product_json(v_product);
END $$;
CREATE FUNCTION public.ai_admin_audit(p_actor uuid,p_page integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_rows jsonb; v_total integer;
BEGIN
 PERFORM public.ai_require_admin(p_actor);
 IF p_page NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT count(*) INTO v_total FROM public.audit_logs;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'actorId',s.admin_id,'action',s.action,'targetId',coalesce(s.target_id,s.order_id),
  'details',s.details,'createdAt',s.created_at) ORDER BY s.created_at DESC,s.id DESC),'[]'::jsonb) INTO v_rows
 FROM(SELECT * FROM public.audit_logs ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET(p_page-1)*50)s;
 RETURN jsonb_build_object('events',v_rows,'total',v_total);
END $$;

CREATE OR REPLACE FUNCTION public.guard_order_price() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE database_price integer; v_quote public.ai_checkout_sessions;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.checkout_session_id IS NOT NULL THEN
   SELECT * INTO v_quote FROM public.ai_checkout_sessions WHERE id=NEW.checkout_session_id FOR SHARE;
   IF NOT FOUND OR v_quote.product_id IS DISTINCT FROM NEW.product_id OR v_quote.order_code IS DISTINCT FROM NEW.order_code OR v_quote.token_hash IS DISTINCT FROM NEW.tracking_token_hash THEN
    RAISE EXCEPTION 'Invalid checkout quote' USING ERRCODE='23514';
   END IF;
   NEW.amount_expected:=v_quote.amount_poisha/100;
   NEW.product_snapshot:=v_quote.product_snapshot;
  ELSE
   SELECT price_bdt INTO database_price FROM public.products WHERE id=NEW.product_id AND is_active FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Product is unavailable' USING ERRCODE='23514',CONSTRAINT='orders_product_available'; END IF;
   NEW.amount_expected:=database_price;
  END IF;
 ELSIF NEW.amount_expected IS DISTINCT FROM OLD.amount_expected OR NEW.product_id IS DISTINCT FROM OLD.product_id
  OR NEW.order_code IS DISTINCT FROM OLD.order_code OR NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at
  OR NEW.checkout_session_id IS DISTINCT FROM OLD.checkout_session_id OR NEW.tracking_token_hash IS DISTINCT FROM OLD.tracking_token_hash
  OR NEW.product_snapshot IS DISTINCT FROM OLD.product_snapshot THEN
  RAISE EXCEPTION 'Order quote is immutable' USING ERRCODE='23514',CONSTRAINT='orders_quote_immutable';
 END IF;
 IF TG_OP='UPDATE' AND OLD.trx_id IS NOT NULL AND NEW.trx_id IS DISTINCT FROM OLD.trx_id THEN
  RAISE EXCEPTION 'Submitted transaction ID is immutable' USING ERRCODE='23514',CONSTRAINT='orders_trx_immutable';
 END IF;
 RETURN NEW;
END $$;

-- Deny public/ordinary user execution even when provider default grants exist.
DO $$ DECLARE f record; r text; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND left(p.proname,3)='ai_' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.signature);
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',f.signature,r);
   END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END IF;
 END LOOP;
END $$;
