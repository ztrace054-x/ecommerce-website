import assert from "node:assert/strict";
import test from "node:test";
import { encrypt, decrypt } from "../src/server/security/encryption.ts";
import { hashPassword, verifyPassword } from "../src/server/security/password.ts";

// Public deterministic fixture, never a production key or seeded credential.
const fixtureKey = Buffer.alloc(32, 7).toString("base64");
const context = "delivery-code:10000000-0000-4000-8000-000000000004";

function withKey(value: string | undefined, check: () => void) {
  const original = process.env.ENCRYPTION_KEY;
  try {
    if (value === undefined) delete process.env.ENCRYPTION_KEY; else process.env.ENCRYPTION_KEY = value;
    check();
  } finally {
    if (original === undefined) delete process.env.ENCRYPTION_KEY; else process.env.ENCRYPTION_KEY = original;
  }
}

test("AES-256-GCM round-trips Unicode and uses a fresh 12-byte IV each time", () => withKey(fixtureKey, () => {
  const text = "SYNTHETIC-VOUCHER-ONLY বাংলা";
  const first = encrypt(text, context);
  const second = encrypt(text, context);
  assert.notEqual(first, second);
  assert.equal(decrypt(first, context), text);
  assert.equal(decrypt(second, context), text);
  assert.equal(Buffer.from(first.split(".")[1]!, "base64url").length, 12);
  assert.equal(Buffer.from(first.split(".")[2]!, "base64url").length, 16);
  assert.ok(!first.includes(text));
}));

test("tampering with IV, tag, ciphertext, version or record context fails authentication", () => withKey(fixtureKey, () => {
  const payload = encrypt("SYNTHETIC-NOT-REDEEMABLE", context);
  for (const index of [1, 2, 3]) {
    const parts = payload.split(".");
    const bytes = Buffer.from(parts[index]!, "base64url");
    bytes[0] = bytes[0]! ^ 1;
    parts[index] = bytes.toString("base64url");
    assert.throws(() => decrypt(parts.join("."), context), /authenticated/u);
  }
  assert.throws(() => decrypt(payload.replace("v1.", "v2."), context), /authenticated/u);
  assert.throws(() => decrypt(payload, "admin-totp:another-record"), /authenticated/u);
  assert.throws(() => decrypt(`${payload}.extra`, context), /authenticated/u);
}));

test("missing, malformed, noncanonical and wrong-length keys fail loudly without revealing them", () => {
  for (const value of [undefined, "", " ", "synthetic-invalid-key", Buffer.alloc(31).toString("base64"), Buffer.alloc(33).toString("base64"), `${fixtureKey}\n`]) {
    withKey(value, () => {
      assert.throws(() => encrypt("synthetic", context), /ENCRYPTION_KEY/u);
      assert.throws(() => decrypt("v1.bad.bad.bad", context), /ENCRYPTION_KEY/u);
    });
  }
});

test("a different valid key, truncated tag, invalid encoding and oversized plaintext fail closed", () => {
  let payload = "";
  withKey(fixtureKey, () => { payload = encrypt("synthetic", context); });
  withKey(Buffer.alloc(32, 8).toString("base64"), () => assert.throws(() => decrypt(payload, context), /authenticated/u));
  withKey(fixtureKey, () => {
    assert.throws(() => decrypt("v1.AAAAAAAAAAAAAAAA.AA.AA", context), /authenticated/u);
    assert.throws(() => decrypt("v1.%bad.tag.cipher", context), /authenticated/u);
    assert.throws(() => encrypt("ক".repeat(2000), context), /too large/u);
    assert.throws(() => encrypt("", context));
  });
});

test("admin passwords use distinct salts, memory-hard scrypt and constant-time verification", async () => {
  const syntheticPassword = "SYNTHETIC-only-passphrase-2026";
  const first = await hashPassword(syntheticPassword);
  const second = await hashPassword(syntheticPassword);
  assert.notEqual(first, second);
  assert.match(first, /^scrypt-v1\$131072\$8\$1\$/u);
  assert.ok(!first.includes(syntheticPassword));
  assert.equal(await verifyPassword(syntheticPassword, first), true);
  assert.equal(await verifyPassword("SYNTHETIC-other-passphrase", first), false);
  assert.equal(await verifyPassword(syntheticPassword, first.replace("131072", "999999999")), false);
  assert.equal(await verifyPassword(syntheticPassword, "plaintext"), false);
  await assert.rejects(hashPassword("short"));
});
