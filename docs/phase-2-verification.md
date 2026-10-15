# Phase 2 verification

Date: 2026-10-12. Phase 1 was approved and merged after the existing lint/types/
11 tests/build/audit and default-port development browser checks passed.
Phase 2 native Compose checks passed in [GitHub Actions run 38215812387](https://github.com/ztrace054-x/ecommerce-website/actions/runs/38215812387)
for d3121a2f4bbac2a29513edf95c032c68497181d6. Completion documentation follows
without application changes; the phase branch is checked before its main merge.

## Local automated checks — passed

- Environment safeguard: blank nine-variable template, ignored private files,
  no tracked/unignored private configuration. No real secrets were created.
- Lint, strict typecheck, build, and all **44 tests** passed: 29 unit/configuration
  tests and 15 PostgreSQL-engine/database/terminal tests, zero skipped.
- Two reviewed migrations ran cleanly and reran safely on fresh disposable
  PostgreSQL-engine instances. The seed CLI inserted four products then zero;
  database tests prove re-seeding preserves edited product prices.
- Canonical TrxID checks, concurrent duplicate UNIQUE rejection, immutable
  assigned IDs, pending/null state, timestamp/state consistency, order-code
  UNIQUE retry, foreign keys and RLS public denial passed.
- DB-only price creation and independent trigger override of a forged amount,
  immutable quote and preservation of earlier prices after product changes passed.
- AES-256-GCM round-trip, fresh IVs, IV/tag/ciphertext/version tampering, context
  swapping, wrong/missing/malformed keys and size bounds passed.
- Actual interactive administrator CLI via pseudo-terminal: hidden password/
  confirmation, mismatch leaves no row, arguments/piped input rejected, secure
  salted hash verifies and duplicate email cannot overwrite the original.
- Migration history check and regeneration: no schema drift. Patched esbuild
  override verified with the generator. Full dependency audit: zero known advisories.
- Static attacker review found no raw/string-built application SQL, raw HTML,
  exposed actions/APIs, auth/payment shortcuts or security TODOs. Browser bundles
  contain no server environment names or synthetic credential markers.

## Runtime/browser review — passed

Database-backed development smoke served the default port 3000 without application
errors. It checked Home/catalog/product/checkout DB prices, query tampering,
inactive and invalid/repeated selectors, policy/contact/FAQ routes and headers.
Future API/admin/login/tracking GET/POST paths remained 404.

Chromium 153 reviewed fresh production and development: 11 principal customer
route instances at 320/375/768/1280px. Bangla, landmarks/headings, layout overflow,
navigation, correct 500/750 BDT prices, inactive products, keyboard/FAQ, local
preview feedback/resets, no-JS safety and Contact-linked WhatsApp passed.
No unexpected external requests, application browser/server errors, or synthetic
input in URLs/requests/storage were found. Servers were stopped after review.

## Attacker review fixes

- Removed price/status/code mass-assignment input paths through strict schemas.
- Added DB price-copy/quote immutability in addition to transaction locking.
- Made assigned TrxIDs immutable so a future write cannot free an original ID.
- Enforced canonical DB checks and RLS denial even with table grants.
- Redacted driver's query/parameters/credential-bearing errors from app operations.
- Replaced the vulnerable transitive esbuild loader dependency with patched 0.25.12;
  no audit exclusion, authentication bypass or forced downgrade was used.
- Removed the mock file and its remaining icon type dependency; all product reads
  now use active database projections, without a cached/mock-price fallback.

## Limits and native PostgreSQL requirement

The managed local workspace has no usable Docker engine and maps only UID 0,
so it cannot run an unprivileged native PostgreSQL process. Local tests/browser
checks used the PGlite PostgreSQL engine over the same node-postgres protocol;
it is a real engine, not an in-memory JavaScript mock, but its multiplexed single
backend does not prove native multi-process locking or Docker initialization.

The committed CI starts **native PostgreSQL 17 with docker-compose.yml**, including
its fresh volume/init script/health check, and runs all tests/build/audit plus
migration/seed/dev-page checks. The retrieved run and every required step concluded **success**. Logs confirm
container health, 29+15 tests with zero failures/skips, successful migrations,
four seeded products, zero known advisories, and the DB-backed dev smoke.
All 88 tracked source files matched the pushed GitHub tree. Final completion
source is pushed and fast-forwarded to main only after the same checks pass.

Terminal automation is Linux/WSL2 (util-linux script). No remote Supabase/TLS
endpoint, Turnstile, Resend, real bKash account or production delivery was tested
or connected. Remote TLS configuration is unit-tested; actual provider certificates,
roles and pools require review when a live connection is separately authorized.

The 10-character TrxID storage format is conservative, not a confirmed contract
for the owner's payment method. Confirm it before accepting real claims. Auth/
2FA, rate limits, bot verification, private tracking and authorized status
transitions are required in their later phases. This is not a public release.

## Acceptance checklist

- [x] Fresh native PostgreSQL migrations run cleanly and rerun safely.
- [x] Seed and actual hidden-terminal admin provisioning work.
- [x] Canonical TrxID UNIQUE and retained-ID guard are enforced by the database.
- [x] No string-built runtime SQL; reviewed migration DDL is static.
- [x] Authenticated encryption/key/context/tamper tests pass.
- [x] All 44 tests, lint, typecheck, build and dependency audit pass.
- [x] npm run dev serves existing customer pages using database products.
- [x] No real secrets, payment API, admin session or live service added.
- [x] README/PLAN Progress/database docs updated; phase commits pushed and checked
      source merged into main. No deployment or Phase 3 work.
