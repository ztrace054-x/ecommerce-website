import { sql } from "drizzle-orm";
import {
  check, foreignKey, index, inet, integer, pgEnum, pgTable, text,
  timestamp, unique, uuid, varchar, boolean,
} from "drizzle-orm/pg-core";

export const deliveryType = pgEnum("delivery_type", ["A", "B", "C"]);
export const orderStatus = pgEnum("order_status", [
  "pending", "submitted", "verified", "delivered", "rejected", "refunded",
]);
export const deliveryCodeStatus = pgEnum("delivery_code_status", ["available", "used"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  description: varchar("description", { length: 4000 }).notNull(),
  priceBdt: integer("price_bdt").notNull(),
  deliveryType: deliveryType("delivery_type").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("products_price_positive", sql`${t.priceBdt} > 0`),
  check("products_name_nonempty", sql`length(btrim(${t.name})) >= 2`),
  check("products_description_nonempty", sql`length(btrim(${t.description})) >= 2`),
  index("products_active_created_idx").on(t.isActive, t.createdAt),
]).enableRLS();

export const orders = pgTable("orders", {
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
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 254 }).notNull().unique("admin_users_email_unique"),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  // Null means unenrolled. Phase 5 must deny sessions until real 2FA enrollment.
  totpSecretEncrypted: text("totp_secret_encrypted"),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  check("admin_users_email_canonical", sql`${t.email} = lower(btrim(${t.email})) AND length(${t.email}) >= 3`),
  check("admin_users_password_hash_format", sql`${t.passwordHash} ~ '^scrypt-v1[$]131072[$]8[$]1[$][A-Za-z0-9_-]{43}[$][A-Za-z0-9_-]{86}$'`),
  check("admin_users_totp_ciphertext_format", sql`${t.totpSecretEncrypted} IS NULL OR (${t.totpSecretEncrypted} ~ '^v1[.][A-Za-z0-9_-]{16}[.][A-Za-z0-9_-]{22}[.][A-Za-z0-9_-]+$' AND octet_length(${t.totpSecretEncrypted}) <= 16384)`),
  check("admin_users_failed_login_nonnegative", sql`${t.failedLoginCount} >= 0`),
]).enableRLS();

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => adminUsers.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 80 }).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }),
  ip: inet("ip").notNull(),
  createdAt: createdAt(),
}, (t) => [
  check("audit_logs_action_format", sql`${t.action} ~ '^[a-z][a-z0-9_.]{0,79}$'`),
  index("audit_logs_admin_created_idx").on(t.adminId, t.createdAt),
  index("audit_logs_order_idx").on(t.orderId),
  index("audit_logs_created_idx").on(t.createdAt),
]).enableRLS();
