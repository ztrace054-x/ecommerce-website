# Verification

Run `npm test` under Node 24. All fixtures use synthetic information and disposable
local state. The original eleven environment tests remain in place.

- validation/crypto/order-code/database-config tests retain the original Phase 2
  contracts, AES-GCM tamper checks, salted scrypt and private configuration rules.
- continuation-validation.test.ts covers new web claims, private tracking keys,
  strict admin evidence, consent and exact whole-BDT/poisha conversion.
- continuation-database.test.ts: actual additive migration/RPCs on PGlite,
  uniqueness/idempotency, quote snapshots, privacy, roles, transitions, rollback,
  atomic rate counters, revocation, product/search/overview/audit operations and
  preservation of populated Phase 2 rows/price guards/append-only grants.
- api.test.ts: actual route handlers over local PostgreSQL with mocked provider
  transport; full quote/claim/track/login/verify/deliver/logout, CSRF/body limits,
  wrong-context/replayed challenge, provider failure, proxy trust, rate limits and
  rejection of password-only/wrong-code/unenrolled administrator login.

- foundation-database.test.ts covers fresh Drizzle typed reads, populated upgrade
  preservation, BDT/generated fields, claim audit attribution/rollback, private
  view grants/RLS and role-change denial. API tests also cover single-product
  sample labels, hidden inactive products, malformed selectors and outages.

`npm test` runs 64 tests. `npm run test:db` runs the retained 15 PostgreSQL/actual
terminal regression tests and requires a separate disposable `TEST_DATABASE_URL`.
CI starts native PostgreSQL 17 with Compose and then runs migration, seed and
HTTP development smoke checks. Native tests now also read the claim view and
generated fields. This workspace has no Docker/native PostgreSQL executable;
the current phase runs PGlite locally and checks native CI after pushing.

`npm run smoke:production` covers the four product APIs (including unsupported
POST), 19 page routes, assets/security headers and closed checkout. `smoke:dev`
starts the existing Next.js development command on port 3000 and stops it after
testing. Neither command publishes anything.

Mocks cannot certify external provider setup. PGlite serializes its one connection;
run independent-connection concurrency and rendered mobile/browser flow tests in
staging before real customer use. No real credentials or payments are required
or permitted in the local automated suite.
