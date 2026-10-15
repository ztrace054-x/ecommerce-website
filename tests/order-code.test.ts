import assert from "node:assert/strict";
import test from "node:test";
import { generateOrderCode, withUniqueOrderCode } from "../src/server/security/order-code.ts";
import { orderCodeSchema } from "../src/server/validators.ts";
import { isDatabaseError } from "../src/server/database/errors.ts";

test("secure order codes match the exact format without ambiguous characters", () => {
  const codes = new Set<string>();
  for (let index = 0; index < 10_000; index++) {
    const code = generateOrderCode();
    assert.equal(orderCodeSchema.safeParse(code).success, true);
    assert.ok(!/[01ILO]/u.test(code.slice(4)));
    codes.add(code);
  }
  assert.equal(codes.size, 10_000);
});

test("order-code UNIQUE collisions retry the insert, including wrapped PostgreSQL errors", async () => {
  let attempts = 0;
  const result = await withUniqueOrderCode(async (code) => {
    attempts++;
    if (attempts === 1) throw { cause: { code: "23505", constraint: "orders_order_code_unique" } };
    return code;
  });
  assert.equal(attempts, 2);
  assert.equal(orderCodeSchema.safeParse(result).success, true);
});

test("collision retry is bounded and never retries a TrxID conflict or unrelated failure", async () => {
  let attempts = 0;
  await assert.rejects(withUniqueOrderCode(async () => {
    attempts++;
    throw { code: "23505", constraint: "orders_order_code_unique" };
  }), /unique order code/u);
  assert.equal(attempts, 8);
  attempts = 0;
  await assert.rejects(withUniqueOrderCode(async () => {
    attempts++;
    throw new Error("unrelated");
  }), /unrelated/u);
  assert.equal(attempts, 1);
  assert.equal(isDatabaseError({ code: "23505", constraint: "orders_trx_id_unique" }, "23505", "orders_order_code_unique"), false);
});
