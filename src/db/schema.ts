import { sql } from "drizzle-orm";
import {
  check, foreignKey, index, inet, integer, pgEnum, pgTable, text,
  timestamp, unique, uuid, varchar, boolean, jsonb, primaryKey, pgView,
} from "drizzle-orm/pg-core";

export const deliveryType = pgEnum("delivery_type", ["A", "B", "C"]);
export const orderStatus = pgEnum("order_status", [
  "pending", "submitted", "verified", "delivered", "rejected", "refunded",
]);
export const deliveryCodeStatus = pgEnum("delivery_code_status", ["available", "used"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const products = pgTable("products", {
  currency: varchar("currency", { length: 3 }).notNull().default("BDT"),
  // Preserve the existing metadata write path without a second category value.
  category: text("category").notNull().generatedAlwaysAs(sql`coalesce(nullif(btrim(storefront_metadata->>'category'), ''), 'সেবা')`),
  storefrontSlug: text("storefront_slug").unique("products_storefront_slug_unique"),
  storefrontMetadata: jsonb("storefront_metadata").notNull().default({}),
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  description: varchar("description", { length: 4000 }).notNull(),
  priceBdt: integer("price_bdt").notNull(),
  deliveryType: deliveryType("delivery_type").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("products_currency_bdt", sql`${t.currency} = 'BDT'`),
  check("products_price_positive", sql`${t.priceBdt} > 0`),
  check("products_name_nonempty", sql`length(btrim(${t.name})) >= 2`),
  check("products_description_nonempty", sql`length(btrim(${t.description})) >= 2`),
  index("products_active_created_idx").on(t.isActive, t.createdAt),
]).enableRLS();

export const orders = pgTable("orders", {
  currency: varchar("currency", { length: 3 }).notNull().default("BDT"),
  // Payment remains verified after fulfillment; clients cannot edit this value.
  paymentStatus: text("payment_status").notNull().generatedAlwaysAs(sql`CASE
    WHEN status = 'pending' THEN 'unpaid'
    WHEN status = 'submitted' THEN 'submitted'
    WHEN status = 'rejected' THEN 'rejected'
    WHEN status = 'refunded' THEN 'refunded'
    ELSE 'verified' END`),
  checkoutSessionId: uuid("checkout_session_id").unique("orders_checkout_session_id_unique").references(() => checkoutSessions.id),
  productSnapshot: jsonb("product_snapshot"),
  trackingTokenHash: text("tracking_token_hash"),
  claimFingerprint: text("claim_fingerprint"),
  customerMessage: text("customer_message").notNull().default(""),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", {withTimezone:true}).notNull().defaultNow(),
  id: uuid("id").primaryKey().defaultRandom(),
  orderCode: varchar("order_code", { length: 12 }).notNull().unique("orders_order_code_unique"),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerEmail: varchar("customer_email", { length: 254 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 16 }),
  senderBkashNumber: varchar("sender_bkash_number", { length: 11 }).notNull(),
  trxId: varchar("trx_id", { length: 10 }).unique("orders_trx_id_unique"),
  amountExpected: integer("amount_expected").notNull(),
  status: orderStatus("status").notNull().default("pending"),
  createdAt: createdAt(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  adminNote: varchar("admin_note", { length: 2000 }),
}, (t) => [
  check("orders_currency_bdt", sql`${t.currency} = 'BDT'`),
  check("orders_tracking_token_format", sql`${t.trackingTokenHash} IS NULL OR ${t.trackingTokenHash} ~ '^[a-f0-9]{64}$'`),
  check("orders_claim_fingerprint_format", sql`${t.claimFingerprint} IS NULL OR ${t.claimFingerprint} ~ '^[a-f0-9]{64}$'`),
  check("orders_version_positive", sql`${t.version} > 0`),
  check("orders_code_format", sql`${t.orderCode} ~ '^ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$'`),
  check("orders_amount_positive", sql`${t.amountExpected} > 0`),
  check("orders_customer_name_nonempty", sql`length(btrim(${t.customerName})) >= 2`),
  check("orders_email_canonical", sql`${t.customerEmail} = lower(btrim(${t.customerEmail})) AND length(${t.customerEmail}) >= 3`),
  check("orders_sender_format", sql`${t.senderBkashNumber} ~ '^01[3-9][0-9]{8}$'`),
  check("orders_whatsapp_format", sql`${t.whatsapp} IS NULL OR ${t.whatsapp} ~ '^[+][1-9][0-9]{7,14}$'`),
  check("orders_trx_canonical", sql`${t.trxId} IS NULL OR ${t.trxId} ~ '^[A-Z0-9]{10}$'`),
  check("orders_submission_state", sql`
    (${t.status} = 'pending' AND ${t.trxId} IS NULL AND ${t.submittedAt} IS NULL)
    OR (${t.status} <> 'pending' AND ${t.trxId} IS NOT NULL AND ${t.submittedAt} IS NOT NULL)`),
  check("orders_verification_state", sql`
    (${t.status} IN ('verified', 'delivered', 'refunded') AND ${t.verifiedAt} IS NOT NULL)
    OR (${t.status} IN ('pending', 'submitted', 'rejected') AND ${t.verifiedAt} IS NULL)`),
  check("orders_delivery_state", sql`
    (${t.status} = 'delivered' AND ${t.deliveredAt} IS NOT NULL)
    OR (${t.status} = 'refunded')
    OR (${t.status} NOT IN ('delivered', 'refunded') AND ${t.deliveredAt} IS NULL)`),
  check("orders_timestamp_order", sql`
    (${t.submittedAt} IS NULL OR ${t.submittedAt} >= ${t.createdAt}) AND
    (${t.verifiedAt} IS NULL OR ${t.verifiedAt} >= ${t.submittedAt}) AND
    (${t.deliveredAt} IS NULL OR ${t.deliveredAt} >= ${t.verifiedAt})`),
  unique("orders_id_product_unique").on(t.id, t.productId),
  index("orders_product_idx").on(t.productId),
  index("orders_status_created_idx").on(t.status, t.createdAt),
]).enableRLS();

export const deliveryCodes = pgTable("delivery_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  codeEncrypted: text("code_encrypted").notNull(),
  status: deliveryCodeStatus("status").notNull().default("available"),
  orderId: uuid("order_id").unique("delivery_codes_order_unique"),
  createdAt: createdAt(),
}, (t) => [
  check("delivery_codes_ciphertext_format", sql`${t.codeEncrypted} ~ '^v1[.][A-Za-z0-9_-]{16}[.][A-Za-z0-9_-]{22}[.][A-Za-z0-9_-]+$' AND octet_length(${t.codeEncrypted}) <= 16384`),
  check("delivery_codes_assignment_state", sql`
    (${t.status} = 'available' AND ${t.orderId} IS NULL)
    OR (${t.status} = 'used' AND ${t.orderId} IS NOT NULL)`),
  foreignKey({
    name: "delivery_codes_order_product_fk",
    columns: [t.orderId, t.productId],
    foreignColumns: [orders.id, orders.productId],
  }).onDelete("restrict"),
  index("delivery_codes_product_status_idx").on(t.productId, t.status),
]).enableRLS();

export const adminUsers = pgTable("admin_users", {
  // Support is reserved. Current admin RPCs/session creation require 'admin'.
  role: text("role").$type<"admin" | "support">().notNull().default("admin"),
  authUserId: uuid("auth_user_id").unique("admin_users_auth_user_id_unique"),
  isActive: boolean("is_active").notNull().default(false),
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 254 }).notNull().unique("admin_users_email_unique"),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  // Null means unenrolled. Phase 5 must deny sessions until real 2FA enrollment.
  totpSecretEncrypted: text("totp_secret_encrypted"),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  check("admin_users_role_valid", sql`${t.role} IN ('admin', 'support')`),
  check("admin_users_email_canonical", sql`${t.email} = lower(btrim(${t.email})) AND length(${t.email}) >= 3`),
  check("admin_users_password_hash_format", sql`${t.passwordHash} ~ '^scrypt-v1[$]131072[$]8[$]1[$][A-Za-z0-9_-]{43}[$][A-Za-z0-9_-]{86}$'`),
  check("admin_users_totp_ciphertext_format", sql`${t.totpSecretEncrypted} IS NULL OR (${t.totpSecretEncrypted} ~ '^v1[.][A-Za-z0-9_-]{16}[.][A-Za-z0-9_-]{22}[.][A-Za-z0-9_-]+$' AND octet_length(${t.totpSecretEncrypted}) <= 16384)`),
  check("admin_users_failed_login_nonnegative", sql`${t.failedLoginCount} >= 0`),
]).enableRLS();

export const auditLogs = pgTable("audit_logs", {
  targetId: uuid("target_id"),
  details: jsonb("details").notNull().default({}),
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => adminUsers.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 80 }).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }),
  ip: inet("ip").notNull().default("0.0.0.0"),
  createdAt: createdAt(),
}, (t) => [
  check("audit_logs_action_format", sql`${t.action} ~ '^[a-z][a-z0-9_.]{0,79}$'`),
  index("audit_logs_admin_created_idx").on(t.adminId, t.createdAt),
  index("audit_logs_order_idx").on(t.orderId),
  index("audit_logs_created_idx").on(t.createdAt),
]).enableRLS();

const time = (name:string)=>timestamp(name,{withTimezone:true}).notNull().defaultNow();
export const checkoutSessions = pgTable("ai_checkout_sessions", {
  id: uuid("id").primaryKey(),
  orderCode: text("order_code").notNull().unique(),
  tokenHash: text("token_hash").notNull().unique(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  productSnapshot: jsonb("product_snapshot").notNull(),
  amountPoisha: integer("amount_poisha").notNull(),
  bkashRecipient: text("bkash_recipient").notNull(),
  paymentMethod: text("payment_method").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: time("created_at"),
}, (t) => [
  check("ai_checkout_sessions_code_format", sql`${t.orderCode} ~ '^ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$'`),
  check("ai_checkout_sessions_token_format", sql`${t.tokenHash} ~ '^[a-f0-9]{64}$'`),
  check("ai_checkout_sessions_amount_valid", sql`${t.amountPoisha} > 0 AND ${t.amountPoisha} <= 100000000 AND ${t.amountPoisha} % 100 = 0`),
  check("ai_checkout_sessions_recipient_format", sql`${t.bkashRecipient} ~ '^01[3-9][0-9]{8}$'`),
  check("ai_checkout_sessions_method_valid", sql`${t.paymentMethod} IN ('payment','send_money')`),
]).enableRLS();
export const adminSessions = pgTable("ai_admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: time("created_at"),
}, (t) => [check("ai_admin_sessions_token_format", sql`${t.tokenHash} ~ '^[a-f0-9]{64}$'`)]).enableRLS();
export const orderNotes = pgTable("ai_order_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  actorId: uuid("admin_id")
    .notNull()
    .references(() => adminUsers.id),
  note: text("note").notNull(),
  createdAt: time("created_at"),
}, (t) => [check("ai_order_notes_length", sql`length(${t.note}) BETWEEN 1 AND 2000`)]).enableRLS();
export const rateLimits = pgTable(
  "ai_rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    hits: integer("hits").notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), check("ai_rate_limits_hits_positive", sql`${t.hits} > 0`)],
).enableRLS();

// One immutable claim per order. Keep the existing orders/audit tables as the
// authority, with a private read-only projection rather than dual writes.
export const paymentClaims = pgView("payment_claims", {
  orderId: uuid("order_id").notNull(),
  trxId: varchar("trx_id", { length: 10 }).notNull(),
  senderBkashNumber: varchar("sender_bkash_number", { length: 11 }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  verificationStatus: text("verification_status").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewAuditId: uuid("review_audit_id"),
}).with({ securityInvoker: true, securityBarrier: true }).as(sql`
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
`);
