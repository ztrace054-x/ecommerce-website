# Automated checks

npm test runs all unit and database/terminal tests; npm run check includes it
with environment checks, lint, typecheck and build. npm run audit:dependencies
includes development dependencies. There are no silently skipped DB tests.

Unit tests cover environment secrecy/ignore rules, strict Zod/normalization,
whole BDT formatting, order-code generation/collision limits, verified remote
TLS configuration, AES-GCM round-trip/tamper/context/key failures, and salted
scrypt password verification. Encryption/password fixtures are explicitly public
synthetic values, never credentials for any actual service or seeded account.

Integration tests require an explicit disposable loopback TEST_DATABASE_URL
whose database name ends in _test, separate from DATABASE_URL. They migrate the
fresh schema and rerun migrations, then clean fixture rows from all five tables.
Never use a database containing data you want to keep. Tests verify idempotent
A/B/C seed, active-only public projection, pending/null claims, DB price snapshots,
forged-price override/immutability, concurrent TrxID UNIQUE enforcement, canonical
format, assigned-TrxID immutability, state/timestamp checks, order-code collision
retry, foreign keys, encrypted-storage guard, admin provisioning and RLS denial.

Terminal tests run the actual creation command in a pseudo-terminal using Linux
util-linux script. They verify hidden password/confirmation, no creation on mismatch,
rejection of piped input/credential arguments, and a correct stored salted hash.
Use Linux/WSL2 for the complete local suite. GitHub CI uses Ubuntu and starts
fresh native PostgreSQL 17 through the committed Docker Compose setup.

npm run smoke:dev starts/stops Next.js on default port 3000 and checks DB-backed
customer pages, price tampering, inactive/invalid selectors, headers and absent
APIs. Stop any other server first. Local browser review additionally checks
mobile/desktop layouts, keyboard/navigation, preview resets and no data leakage.

Rate limits, Turnstile, admin sessions/2FA, authorized status transitions and
private tracking do not exist yet. Their full attack tests are mandatory in
Phases 3–5; absence of an endpoint is not a substitute for those future controls.
See docs/phase-2-verification.md and PLAN.md for actual evidence and limitations.
