import "server-only";
import { randomInt } from "node:crypto";
import { isDatabaseError } from "../database/errors.ts";

const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const maxAttempts = 8;

export function generateOrderCode(): string {
  let suffix = "";
  for (let index = 0; index < 8; index++) suffix += alphabet[randomInt(alphabet.length)];
  return `ORD-${suffix}`;
}

/** Insert first; never depend on a racy SELECT-to-check-uniqueness. */
export async function withUniqueOrderCode<T>(
  insert: (code: string) => Promise<T>,
  generate: () => string = generateOrderCode,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await insert(generate());
    } catch (error) {
      if (!isDatabaseError(error, "23505", "orders_order_code_unique")) throw error;
    }
  }
  throw new Error("Could not allocate a unique order code. Try again.");
}
