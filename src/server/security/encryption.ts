import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { requireServerEnv } from "../../lib/env/server.ts";

const contextSchema = z.string().min(1).max(200);
const encryptedPayloadSchema = z.string().min(1).max(16384);
const maxBytes = 4096;

function encryptionKey(): Buffer {
  const encoded = requireServerEnv("ENCRYPTION_KEY");
  if (!/^[A-Za-z0-9+/]{43}=$/u.test(encoded)) {
    throw new Error("ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes.");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error("ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes.");
  }
  return key;
}

/** Context should be delivery-code:<UUID> or admin-totp:<UUID>, never a browser value. */
export function encrypt(plaintext: string, context: string): string {
  z.string().min(1).max(maxBytes).parse(plaintext);
  contextSchema.parse(context);
  if (Buffer.byteLength(plaintext, "utf8") > maxBytes) throw new Error("Encryption input is too large.");
  const key = encryptionKey();
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    cipher.setAAD(Buffer.from(`ai-services:v1:${context}`, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
  } finally {
    key.fill(0);
  }
}

export function decrypt(payload: string, context: string): string {
  contextSchema.parse(context);
  const key = encryptionKey();
  try {
    encryptedPayloadSchema.parse(payload);
    const parts = payload.split(".");
    const [version, ivText, tagText, cipherText] = parts;
    if (parts.length !== 4 || version !== "v1" || !ivText || !tagText || !cipherText ||
      ![ivText, tagText, cipherText].every((value) => /^[A-Za-z0-9_-]+$/u.test(value))) throw new Error();
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    const ciphertext = Buffer.from(cipherText, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length < 1 || ciphertext.length > maxBytes ||
      iv.toString("base64url") !== ivText || tag.toString("base64url") !== tagText ||
      ciphertext.toString("base64url") !== cipherText) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    decipher.setAAD(Buffer.from(`ai-services:v1:${context}`, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Encrypted value could not be authenticated.");
  } finally {
    key.fill(0);
  }
}
