import assert from "node:assert/strict";
import test from "node:test";
import {
  claimSchema,
  quoteSchema,
  trackingSchema,
  statusSchema,
  productSchema,
  bangladeshPhone,
  trxIdField,
} from "../src/lib/validation.ts";
import { canTransition } from "../src/lib/domain.ts";
import {
  createToken,
  hashToken,
  createOrderCode,
} from "../src/lib/security/crypto.ts";
const claim = {
  quoteToken: "a".repeat(64),
  customerName: "নমুনা গ্রাহক",
  customerEmail: " DEMO@EXAMPLE.COM ",
  bkashSender: "+8801700000000",
  trxId: " a1b2c3d4e5 ",
  turnstileToken: "synthetic-token",
  acceptedTerms: true,
};
test("claims normalize email, Bangladesh numbers and canonical TrxIDs", () => {
  const result = claimSchema.parse(claim);
  assert.equal(result.customerEmail, "demo@example.com");
  assert.equal(result.bkashSender, "01700000000");
  assert.equal(result.trxId, "A1B2C3D4E5");
  assert.equal(bangladeshPhone.parse("8801900000000"), "01900000000");
});
test("client prices, status, extra fields, scripts and missing consent are rejected", () => {
  for (const extra of [
    { pricePoisha: 1 },
    { status: "verified" },
    { customerName: "<script>alert(1)</script>" },
    { acceptedTerms: false },
    { bkashSender: "01200000000" },
    { whatsapp: "bad-number" },
  ])
    assert.equal(claimSchema.safeParse({ ...claim, ...extra }).success, false);
  assert.equal(
    quoteSchema.safeParse({
      productId: "00000000-0000-4000-8000-000000000001",
      price: 1,
    }).success,
    false,
  );
});
test("tracking requires a 256-bit secret alongside email and display code", () => {
  assert.equal(
    trackingSchema.safeParse({
      orderCode: createOrderCode(),
      customerEmail: "demo@example.com",
    }).success,
    false,
  );
  assert.equal(trxIdField.safeParse("../../BAD!").success, false);
  assert.equal(createToken().length, 64);
  assert.equal(hashToken(createToken()).length, 64);
  assert.match(createOrderCode(), /^ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
});
test("status updates require payment evidence, delivery confirmation and customer rejection reasons", () => {
  assert.equal(
    statusSchema.safeParse({
      status: "verified",
      expectedVersion: 1,
      note: "test",
    }).success,
    false,
  );
  assert.equal(
    statusSchema.safeParse({
      status: "verified",
      expectedVersion: 1,
      note: "test",
      checkedPayment: true,
      verifiedAmountPoisha: 50000,
    }).success,
    true,
  );
  assert.equal(
    statusSchema.safeParse({
      status: "delivered",
      expectedVersion: 2,
      note: "test",
    }).success,
    false,
  );
  assert.equal(
    statusSchema.safeParse({
      status: "rejected",
      expectedVersion: 1,
      note: "test",
    }).success,
    false,
  );
  assert.equal(canTransition("submitted", "delivered"), false);
  assert.equal(canTransition("delivered", "verified"), false);
  assert.equal(canTransition("submitted", "rejected"), true);
  assert.equal(canTransition("verified", "delivered"), true);
});
test("product prices are bounded integer poisha and credential resale types are unavailable", () => {
  const p = {
    slug: "demo-service",
    name: "Demo service",
    description: "Synthetic description",
    category: "Demo",
    pricePoisha: 100,
    unit: "Session",
    duration: "Agreed time",
    icon: "setup",
    includes: ["Sample feature"],
    deliveryType: "service",
    deliveryMethod: "Email",
    deliveryNote: "Synthetic note",
    terms: "Synthetic terms only",
    active: false,
  };
  assert.equal(productSchema.safeParse(p).success, true);
  for (const extra of [
    { pricePoisha: -1 },
    { pricePoisha: 1.5 },
    { pricePoisha: 12345 },
    { pricePoisha: 100000001 },
    { deliveryType: "shared_account" },
    { slug: "../bad" },
  ])
    assert.equal(productSchema.safeParse({ ...p, ...extra }).success, false);
});
