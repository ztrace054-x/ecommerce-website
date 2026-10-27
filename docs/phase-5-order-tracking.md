# Phase 5 customer order tracking

This branch adds POST /api/orders/track and /track. No administrator transitions,
email, delivery or customer-account logic is added. The existing Phase 4 stack,
env loader, IP/HMAC helpers, database connection and limiter, JSON boundary,
Turnstile verifier and response shape are reused. No dependencies or env variables
were added. The existing Turnstile verifier accepts a purpose argument: `order`
for checkout and `track` for tracking. Tracking always requires verification,
keeping the policy consistent without a client-visible attempt threshold.

## Setup and limits

Run `npm ci`, then `DATABASE_URL=<secure local setting> npm run db:migrate`.
The existing migration runner now applies both immutable, checksummed migrations
in order. 0002_tracking adds a server-only RLS-enabled table for hashed code locks.
Use the documented Phase 4 loopback database and official test-key configuration;
never run tests against a production database. `npm test` runs test files serially
because the two integration suites reset shared disposable tables. Tests inside
the tracking suite explicitly exercise concurrent requests; no tests are skipped.

- Per-IP: the existing PostgreSQL sliding-window limiter allows 10 attempts per
  10 minutes under a separate HMAC-derived tracking key. Order creation keeps its
  existing 5/10-minute and 20/day limits.
- Per-code: five unsuccessful credential comparisons within 15 minutes lock
  lookups for that code for 15 minutes from the fifth failure. That fifth failure
  returns the generic 404; subsequent attempts receive 429 and Retry-After.
- Successes neither increment nor erase recent failures. Missing codes have the
  same counters and response as wrong suffixes. PostgreSQL row locks serialize
  comparisons/accounting across IPs and replicas; the lock is checked again inside
  the transaction after captcha verification to close concurrent-request races.
- Invalid bodies and captcha failures consume IP attempts but do not count as
  failed credential comparisons. Origin/type/size rejections precede IP processing.
- Audit entries for processed attempts contain a domain-separated HMAC of the
  order code (or null for unusable input), an IP HMAC and a fixed result label.
  They never contain last4, phone, email or TrxID. Audit failure rolls back the
  credential attempt and its state update; API errors remain generic.

The server selects only public result fields plus the four-digit suffix needed
for comparison. It executes a fixed-size timingSafeEqual comparison against a
dummy suffix even when the database has no matching order. Database/cache timing
is not claimed to be mathematically constant. Returned fields are orderCode,
status, productName, amountExpected, createdAt and a bilingual message. No internal
IDs, email, phone, TrxID, administrator note or IP hash are returned.

## UI and headers

Tracking inputs are sent only in POST JSON. Checkout passes the order code through
a one-time in-memory handoff on the /track link. It is never put in app URLs,
query strings, cookies or browser storage. Reloading loses that handoff; customers
can paste their code. A user-initiated WhatsApp link includes the code in its
prefilled message, as requested. The app does not send the WhatsApp message.

The form has bilingual labels, uppercase formatting, numeric last-four input,
field errors, loading/disabled states, generic lookup errors and a Retry-After
message. Successful results show the submitted/verified/delivered timeline;
rejected/refunded are separate end states. Last4 is cleared after a request.
All rendering uses JSX text. Both routes inherit nonce CSP/security headers and
no-store, with no-referrer added for tracking. /track is noindex/nofollow.

## Evidence — 2026-10-27

Part A merged PR #2 without rewriting history or deleting the feature branch:
`7a00318843050ed862bad0eb84773f50a7e3ef10`. Updated main was clean and private,
with the database/helpers/API present. Lockfile install, lint, type-check, all
26 tests, production build and audit passed (zero vulnerabilities). Only the blank
.env.example template was tracked; no private env files were tracked.

Phase 5 checks ran in order and passed: lockfile install, lint, type-check,
**37 tests, zero failed/skipped** (including the original 26), production build,
and npm audit with zero vulnerabilities. No dependency versions changed.
Local database migration succeeded. Existing Phase 4 tests also verify shared
request-boundary and Turnstile refactoring; their assertions remain intact.

Production-build curl checks used real Cloudflare Siteverify with official test
keys, a local PostgreSQL database and synthetic data. No captcha bypass or mock
was used for those live checks. Unit/integration tests inject captcha outcomes to
exercise failure branches deterministically.

| Check | Actual result |
| --- | --- |
| Found | 200, minimal six-field public view |
| Wrong last4 | 404, generic not-found body |
| Unknown code | 404, byte-identical body to wrong last4 |
| Five failures | Five 404s; next request 429, Retry-After: 900 |
| Bad Origin | 403 |
| GET | 405, Allow: POST |
| /track and /api/orders/track headers | no-store, no-referrer, nonce CSP |
| /track HTML | 200, noindex, both labelled inputs present |

Tests additionally cover every status message, private-field exclusion, invalid
schemas/unknown fields, SQL/XSS payloads, content type, size, captcha failures,
all unsupported methods, per-IP limits, per-code limits across different IPs,
lock expiry, success accounting, concurrent failures and safe audit contents.

## Security review and remaining work

| Area | Assessment |
| --- | --- |
| IDOR | PARTIAL: code plus last4 gates a minimal view, but four digits are a weak possession factor. |
| Enumeration | PARTIAL: identical missing/mismatch responses and dummy comparison; database timing and leaked codes remain considerations. |
| Brute-force | PARTIAL: local concurrent PostgreSQL tests pass; deployment headers, replicas and distributed abuse require verification. |
| XSS | PASS within tested scope: formats reject payloads, JSX escapes text, CSP remains enforced. |
| CSRF | PASS: exact origin/referrer and JSON-only boundary inherited and tested. |
| Data leakage | PASS within tested scope: allowlisted response fields and hashed audit entries. |
| Caching | PASS: production HTTP checks confirm no-store and no-referrer. |

**pending: verify manually in a real browser** — Turnstile rendering and complete
interactive mobile/desktop flow. The owner forbids trusting the environment proxy
CA, including temporarily; no trust change or TLS bypass was performed. Validate
Vercel's single-IP header behavior and deployed multi-replica limits. A known code
can be deliberately locked by an attacker; the requested lock design trades this
availability risk for brute-force resistance. Define support/unlock procedures.

Configure scheduled cleanup of expired rate events and inactive code-limit rows
(only after both window and lock have expired); define retention for audit data.
Do not treat hashes as anonymous data. Preserve HMAC keys consistently across
replicas; rotating a key changes counters. No live database/hosting was connected.

Recommended next task: Phase 6, administrator panel with 2FA, under separate
approval and a reviewed authorization/session design. Do not merge Phase 5 or
start administrator features without owner approval.
