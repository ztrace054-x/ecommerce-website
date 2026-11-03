import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { TOTP, Secret } from "otpauth";
export const opaque = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const equal = (a: string, b: string) => timingSafeEqual(Buffer.from(digest(a), "hex"), Buffer.from(digest(b), "hex"));
export function validPassword(value: string) {
  return value.length >= 14 && value.length <= 256 && !["password", "qwerty", "123456", "letmein", "administrator"].some(word => value.toLowerCase().includes(word)) && new Set(value).size >= 8;
}
export const hashPassword = (value: string) => argon2.hash(value, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
export const verifyPassword = (hash: string, value: string) => argon2.verify(hash, value);
export function encrypt(value: string, key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  cipher.setAAD(Buffer.from("admin-totp-v1"));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString("base64")).join(".");
}
export function decrypt(value: string, key: string) {
  const [iv, tag, data] = value.split(".").map(v => Buffer.from(v, "base64"));
  if (!iv || !tag || !data) throw new Error("Invalid encrypted value.");
  const cipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  cipher.setAAD(Buffer.from("admin-totp-v1"));cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
export const totp = (secret: string, label = "Administrator") => new TOTP({ issuer: "Manual order administration", label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secret) });
export const newTotpSecret = () => new Secret({ size: 20 }).base32;
