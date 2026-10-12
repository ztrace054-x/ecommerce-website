import { createDatabase, isLoopback, parseDatabaseUrl } from "../../src/server/database/connection.ts";

/** Never fall back to DATABASE_URL or touch a remote/ordinary development DB. */
export function testDatabaseUrl(value = process.env.TEST_DATABASE_URL): string {
  if (!value) throw new Error("Set TEST_DATABASE_URL to a disposable local database whose name ends in _test. Database tests are never skipped.");
  const url = parseDatabaseUrl(value);
  if (!isLoopback(url) || !/^\/[A-Za-z0-9_-]+_test$/u.test(url.pathname)) {
    throw new Error("Database tests require a loopback database with a name ending in _test.");
  }
  if (process.env.DATABASE_URL) {
    const application = parseDatabaseUrl(process.env.DATABASE_URL);
    if (url.pathname === application.pathname && (url.port || "5432") === (application.port || "5432")) {
      throw new Error("The test database must differ from the application database.");
    }
  }
  return value;
}

export function connectTestDatabase() {
  return createDatabase(testDatabaseUrl());
}
