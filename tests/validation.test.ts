import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrderSchema, normalizeTrxId, trxIdSchema, productInputSchema,
  adminCreationSchema, auditInputSchema, paymentClaimSchema, whatsappSchema,
} from "../src/server/validators.ts";
import { findActiveProduct } from "../src/server/catalog.ts";
import { createPendingOrder } from "../src/server/orders.ts";
import { formatTaka } from "../src/lib/format.ts";

const input = {
  productId: "10000000-0000-4000-8000-000000000001",
  customerName: "  নমুনা শিক্ষার্থী  ", customerEmail: " DEMO@EXAMPLE.COM ",
  senderBkashNumber: "01700000000",
};

test("TrxID normalization trims and uppercases without stripping punctuation", () => {
  assert.equal(normalizeTrxId("  abc123de45\n"), "ABC123DE45");
  assert.equal(trxIdSchema.parse("  abc123de45  "), "ABC123DE45");
  assert.equal(normalizeTrxId("abc-123"), "ABC-123");
});

test("TrxID rejects wrong length, punctuation, internal spaces, Unicode and non-string input", () => {
  for (const value of ["", "ABC", "ABC123DE456", "ABC-23DE45", "ABC 23DE45", "ＡBC123DE45", "abc123💰45", 123, null, "x".repeat(65)]) {
    assert.equal(trxIdSchema.safeParse(value).success, false);
  }
});

test("order input validates and canonicalizes minimum customer fields", () => {
  const result = createOrderSchema.parse(input);
  assert.equal(result.customerName, "নমুনা শিক্ষার্থী");
  assert.equal(result.customerEmail, "demo@example.com");
  assert.equal(result.whatsapp, null);
  assert.equal(whatsappSchema.parse("01700000000"), "+8801700000000");
  assert.equal(whatsappSchema.parse(""), null);
  assert.equal(whatsappSchema.parse("+8801700000000"), "+8801700000000");
});

test("every price/status/code/unknown field is rejected instead of trusted", async () => {
  for (const field of ["amountExpected", "amount_expected", "price", "price_bdt", "status", "orderCode", "trxId", "adminId", "__proto__"]) {
    const tampered = { ...input, [field]: 1 };
    assert.equal(createOrderSchema.safeParse(tampered).success, false, field);
    await assert.rejects(createPendingOrder(tampered), { name: "ZodError" });
  }
});

test("invalid IDs, contact fields, controls and oversized input fail before database access", async () => {
  for (const patch of [
    { productId: "1 OR 1=1" }, { customerName: " " }, { customerName: "a\0b" },
    { customerName: "a".repeat(101) }, { customerEmail: "invalid" },
    { senderBkashNumber: "01200000000" }, { senderBkashNumber: "০১৭০০০০০০০০" },
    { whatsapp: "javascript:bad" }, { whatsapp: "+000000000" },
  ]) await assert.rejects(createPendingOrder({ ...input, ...patch }), { name: "ZodError" });
  assert.equal(await findActiveProduct("' OR true; --"), undefined);
  assert.equal(await findActiveProduct([input.productId]), undefined);
});

test("storage validators reject fractional/negative prices, fake delivery types, weak admin inputs and unsafe audit fields", () => {
  const product = { id: input.productId, name: "Demo product", description: "Synthetic example", priceBdt: 500, deliveryType: "C", isActive: false };
  for (const value of [0, -1, 1.5, "500", 2_147_483_648]) assert.equal(productInputSchema.safeParse({ ...product, priceBdt: value }).success, false);
  assert.equal(productInputSchema.safeParse({ ...product, deliveryType: "shared-login" }).success, false);
  assert.equal(adminCreationSchema.safeParse({ email: "demo@example.com", password: "short" }).success, false);
  assert.equal(adminCreationSchema.safeParse({ email: "demo@example.com", password: "synthetic-passphrase-only", role: "admin" }).success, false);
  assert.equal(auditInputSchema.safeParse({ adminId: input.productId, action: "order.verified", orderId: null, ip: "127.0.0.1" }).success, true);
  assert.equal(auditInputSchema.safeParse({ adminId: input.productId, action: "password=secret", orderId: null, ip: "bad-ip" }).success, false);
  assert.equal(paymentClaimSchema.safeParse({ orderId: input.productId, trxId: "ABC123DE45", status: "verified" }).success, false);
});

test("whole BDT formatting does not divide database prices into poisha", () => {
  assert.match(formatTaka(500), /৫০০/u);
  assert.match(formatTaka(750), /৭৫০/u);
});
