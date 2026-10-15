import { createHash, randomBytes, randomUUID } from "node:crypto";
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const createToken = () => randomBytes(32).toString("hex");
export { generateOrderCode as createOrderCode } from "../../server/security/order-code.ts";
export { randomUUID };
