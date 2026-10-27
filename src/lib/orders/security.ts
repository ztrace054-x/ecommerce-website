import { createHmac, randomInt } from "node:crypto";
import { isIP } from "node:net";

// Assumption: verify against real bKash transactions before accepting payments.
// Change this single constant if the confirmed provider format differs.
export const TRX_ID_PATTERN = /^[A-Z0-9]{8,12}$/;
export function normalizeTrxId(input: string) { return input.replace(/\s/g, "").toUpperCase(); }
export function normalizeBdPhone(input: string) {
  const phone = input.trim().replace(/^\+?880/, "0");
  if (!/^01[3-9]\d{8}$/.test(phone)) throw new Error("Invalid Bangladesh phone number.");
  return phone;
}
export const ORDER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function generateOrderCode() {
  return "ORD-" + Array.from({ length: 8 }, () => ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)]).join("");
}
export function hashIp(ip: string, secret: string) {
  if (secret.length < 32) throw new Error("IP hashing configuration missing.");
  return createHmac("sha256", secret).update(ip).digest("hex");
}
export function getClientIp(request: Request, mode: "local" | "vercel") {
  // Deployment MUST prevent direct access and overwrite the selected header.
  // Never trust arbitrary x-forwarded-for supplied by a client.
  if (mode === "local") return "127.0.0.1";
  const value = request.headers.get("x-forwarded-for")?.trim();
  if (!value || !isIP(value)) throw new Error("Trusted client IP unavailable.");
  return value;
}
