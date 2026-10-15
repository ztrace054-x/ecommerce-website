import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { passwordSchema } from "../validators.ts";

const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const passwordHashSchema = z.string().max(255)
  .regex(/^scrypt-v1\$131072\$8\$1\$[A-Za-z0-9_-]{43}\$[A-Za-z0-9_-]{86}$/u);

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, hash) => error ? reject(error) : resolve(hash));
  });
}

export async function hashPassword(value: string): Promise<string> {
  const password = passwordSchema.parse(value);
  const salt = randomBytes(32);
  const hash = await derive(password, salt);
  return `scrypt-v1$131072$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** Fixed parameters prevent malicious stored hashes from selecting huge costs. */
export async function verifyPassword(value: string, encoded: string): Promise<boolean> {
  if (!passwordSchema.safeParse(value).success || !passwordHashSchema.safeParse(encoded).success) return false;
  const [, , , , saltText, hashText] = encoded.split("$");
  if (!saltText || !hashText) return false;
  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(hashText, "base64url");
  if (salt.length !== 32 || expected.length !== 64 ||
    salt.toString("base64url") !== saltText || expected.toString("base64url") !== hashText) return false;
  const actual = await derive(value, salt);
  return timingSafeEqual(actual, expected);
}
