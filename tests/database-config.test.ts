import assert from "node:assert/strict";
import test from "node:test";
import { databasePoolConfig, parseDatabaseUrl } from "../src/server/database/connection.ts";
import { testDatabaseUrl } from "./helpers/database.ts";

test("only loopback development permits plaintext PostgreSQL; remote TLS always verifies the server", () => {
  assert.equal(databasePoolConfig("postgresql://demo@127.0.0.1/ecommerce").ssl, false);
  assert.deepEqual(databasePoolConfig("postgresql://demo:synthetic@db.example.com/ecommerce").ssl, { rejectUnauthorized: true });
  assert.deepEqual(databasePoolConfig("postgresql://demo:synthetic@db.example.com/ecommerce?sslmode=verify-full").ssl, { rejectUnauthorized: true });
  for (const mode of ["disable", "prefer", "require", "no-verify"]) {
    assert.throws(() => databasePoolConfig(`postgresql://demo@db.example.com/ecommerce?sslmode=${mode}`), /TLS/u);
  }
});

test("configuration rejects unsafe URL options and errors do not contain credentials", () => {
  const synthetic = "SYNTHETIC-CONFIG-CREDENTIAL";
  for (const value of ["", `https://demo:${synthetic}@db.example.com/db`, `postgresql://demo:${synthetic}@db.example.com/db?options=unsafe`, "postgresql://demo@localhost/", " postgres://demo@localhost/db"]) {
    assert.throws(() => parseDatabaseUrl(value), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes(synthetic));
      return true;
    });
  }
});

test("database test configuration never falls back to application or remote data", () => {
  assert.throws(() => testDatabaseUrl(""), /TEST_DATABASE_URL/u);
  assert.throws(() => testDatabaseUrl("postgres://demo@db.example.com/ecommerce_test"), /loopback/u);
  assert.throws(() => testDatabaseUrl("postgres://demo@localhost/ecommerce"), /_test/u);
  assert.equal(testDatabaseUrl("postgres://demo@127.0.0.1/isolated_fixture_test"), "postgres://demo@127.0.0.1/isolated_fixture_test");
});
