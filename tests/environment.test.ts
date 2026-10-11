import assert from "node:assert/strict";
import test from "node:test";

import { publicEnv } from "../src/lib/env/public.ts";
import { requireServerEnv } from "../src/lib/env/server.ts";

const requiredNames = [
  "DATABASE_URL",
  "TURNSTILE_SECRET_KEY",
  "RESEND_API_KEY",
  "ADMIN_SECRET",
  "ENCRYPTION_KEY",
] as const;

function withEnvironmentValue(
  name: string,
  value: string | undefined,
  check: () => void,
) {
  const original = process.env[name];

  try {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    check();
  } finally {
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  }
}

test("every server key fails closed for missing and blank configuration", () => {
  for (const name of requiredNames) {
    for (const value of [undefined, "", " \t\n "]) {
      withEnvironmentValue(name, value, () => {
        assert.throws(() => requireServerEnv(name), {
          message: `Missing server environment variable: ${name}`,
        });
      });
    }
  }
});

test("configuration is read lazily, without defaults or changes to supplied values", () => {
  // Deliberately synthetic strings, not real keys or credentials.
  withEnvironmentValue("ADMIN_SECRET", " synthetic-phase-0-value-one ", () => {
    assert.equal(requireServerEnv("ADMIN_SECRET"), " synthetic-phase-0-value-one ");
    process.env.ADMIN_SECRET = "synthetic-phase-0-value-two";
    assert.equal(requireServerEnv("ADMIN_SECRET"), "synthetic-phase-0-value-two");
    delete process.env.ADMIN_SECRET;
    assert.throws(() => requireServerEnv("ADMIN_SECRET"));
  });
});

test("runtime callers cannot request an unapproved environment name", () => {
  for (const name of ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "PATH", "__proto__"]) {
    // The cast exercises the runtime boundary for untyped callers.
    assert.throws(() => requireServerEnv(name as never), {
      message: "Unsupported server environment variable name.",
    });
  }
});

test("public configuration is frozen and exposes only the Turnstile site-key field", () => {
  assert.deepEqual(Object.keys(publicEnv), ["turnstileSiteKey"]);
  assert.ok(Object.isFrozen(publicEnv));
});
