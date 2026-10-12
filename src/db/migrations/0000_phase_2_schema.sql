CREATE TYPE "public"."delivery_code_status" AS ENUM('available', 'used');--> statement-breakpoint
CREATE TYPE "public"."delivery_type" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'submitted', 'verified', 'delivered', 'rejected', 'refunded');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"totp_secret_encrypted" text,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email"),
	CONSTRAINT "admin_users_email_canonical" CHECK ("admin_users"."email" = lower(btrim("admin_users"."email")) AND length("admin_users"."email") >= 3),
	CONSTRAINT "admin_users_password_hash_format" CHECK ("admin_users"."password_hash" ~ '^scrypt-v1[$]131072[$]8[$]1[$][A-Za-z0-9_-]{43}[$][A-Za-z0-9_-]{86}$'),
	CONSTRAINT "admin_users_totp_ciphertext_format" CHECK ("admin_users"."totp_secret_encrypted" IS NULL OR ("admin_users"."totp_secret_encrypted" ~ '^v1[.][A-Za-z0-9_-]{16}[.][A-Za-z0-9_-]{22}[.][A-Za-z0-9_-]+$' AND octet_length("admin_users"."totp_secret_encrypted") <= 16384)),
	CONSTRAINT "admin_users_failed_login_nonnegative" CHECK ("admin_users"."failed_login_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"order_id" uuid,
	"ip" "inet" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_action_format" CHECK ("audit_logs"."action" ~ '^[a-z][a-z0-9_.]{0,79}$')
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "delivery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"code_encrypted" text NOT NULL,
	"status" "delivery_code_status" DEFAULT 'available' NOT NULL,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_codes_order_unique" UNIQUE("order_id"),
	CONSTRAINT "delivery_codes_ciphertext_format" CHECK ("delivery_codes"."code_encrypted" ~ '^v1[.][A-Za-z0-9_-]{16}[.][A-Za-z0-9_-]{22}[.][A-Za-z0-9_-]+$' AND octet_length("delivery_codes"."code_encrypted") <= 16384),
	CONSTRAINT "delivery_codes_assignment_state" CHECK (
    ("delivery_codes"."status" = 'available' AND "delivery_codes"."order_id" IS NULL)
    OR ("delivery_codes"."status" = 'used' AND "delivery_codes"."order_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "delivery_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_code" varchar(12) NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"customer_email" varchar(254) NOT NULL,
	"whatsapp" varchar(16),
	"sender_bkash_number" varchar(11) NOT NULL,
	"trx_id" varchar(10),
	"amount_expected" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"admin_note" varchar(2000),
	CONSTRAINT "orders_order_code_unique" UNIQUE("order_code"),
	CONSTRAINT "orders_trx_id_unique" UNIQUE("trx_id"),
	CONSTRAINT "orders_id_product_unique" UNIQUE("id","product_id"),
	CONSTRAINT "orders_code_format" CHECK ("orders"."order_code" ~ '^ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$'),
	CONSTRAINT "orders_amount_positive" CHECK ("orders"."amount_expected" > 0),
	CONSTRAINT "orders_customer_name_nonempty" CHECK (length(btrim("orders"."customer_name")) >= 2),
	CONSTRAINT "orders_email_canonical" CHECK ("orders"."customer_email" = lower(btrim("orders"."customer_email")) AND length("orders"."customer_email") >= 3),
	CONSTRAINT "orders_sender_format" CHECK ("orders"."sender_bkash_number" ~ '^01[3-9][0-9]{8}$'),
	CONSTRAINT "orders_whatsapp_format" CHECK ("orders"."whatsapp" IS NULL OR "orders"."whatsapp" ~ '^[+][1-9][0-9]{7,14}$'),
	CONSTRAINT "orders_trx_canonical" CHECK ("orders"."trx_id" IS NULL OR "orders"."trx_id" ~ '^[A-Z0-9]{10}$'),
	CONSTRAINT "orders_submission_state" CHECK (
    ("orders"."status" = 'pending' AND "orders"."trx_id" IS NULL AND "orders"."submitted_at" IS NULL)
    OR ("orders"."status" <> 'pending' AND "orders"."trx_id" IS NOT NULL AND "orders"."submitted_at" IS NOT NULL)),
	CONSTRAINT "orders_verification_state" CHECK (
    ("orders"."status" IN ('verified', 'delivered', 'refunded') AND "orders"."verified_at" IS NOT NULL)
    OR ("orders"."status" IN ('pending', 'submitted', 'rejected') AND "orders"."verified_at" IS NULL)),
	CONSTRAINT "orders_delivery_state" CHECK (
    ("orders"."status" = 'delivered' AND "orders"."delivered_at" IS NOT NULL)
    OR ("orders"."status" = 'refunded')
    OR ("orders"."status" NOT IN ('delivered', 'refunded') AND "orders"."delivered_at" IS NULL)),
	CONSTRAINT "orders_timestamp_order" CHECK (
    ("orders"."submitted_at" IS NULL OR "orders"."submitted_at" >= "orders"."created_at") AND
    ("orders"."verified_at" IS NULL OR "orders"."verified_at" >= "orders"."submitted_at") AND
    ("orders"."delivered_at" IS NULL OR "orders"."delivered_at" >= "orders"."verified_at"))
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" varchar(4000) NOT NULL,
	"price_bdt" integer NOT NULL,
	"delivery_type" "delivery_type" NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_positive" CHECK ("products"."price_bdt" > 0),
	CONSTRAINT "products_name_nonempty" CHECK (length(btrim("products"."name")) >= 2),
	CONSTRAINT "products_description_nonempty" CHECK (length(btrim("products"."description")) >= 2)
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_codes" ADD CONSTRAINT "delivery_codes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_codes" ADD CONSTRAINT "delivery_codes_order_product_fk" FOREIGN KEY ("order_id","product_id") REFERENCES "public"."orders"("id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_admin_created_idx" ON "audit_logs" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_order_idx" ON "audit_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "delivery_codes_product_status_idx" ON "delivery_codes" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "orders_product_idx" ON "orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "products_active_created_idx" ON "products" USING btree ("is_active","created_at");