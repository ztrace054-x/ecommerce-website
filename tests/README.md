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

`npm test` runs 54 tests. `npm run test:db` runs the retained 15 PostgreSQL/actual
terminal regression tests and requires a separate disposable `TEST_DATABASE_URL`.
CI starts native PostgreSQL 17 with Compose and then runs migration, seed and
HTTP development smoke checks. This workspace ran those 15 tests via disposable
PGlite socket servers; it has no Docker/native PostgreSQL executable.

Mocks cannot certify external provider setup. PGlite serializes its one connection;
run independent-connection concurrency and rendered mobile/browser flow tests in
staging before real customer use. No real credentials or payments are required
or permitted in the local automated suite.
