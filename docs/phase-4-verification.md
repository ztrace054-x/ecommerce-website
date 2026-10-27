# Phase 4 verification — 2026-10-27

Scope: `feat/phase-4-order-api`, Next.js 16.4.3. All database checks used the
isolated loopback PostgreSQL `ecommerce_test` database and synthetic identities,
phone numbers and TrxIDs. Turnstile live checks use Cloudflare's official test
keys and verification endpoint. No production database, real payment, or customer
data was used. No push, merge, deployment, or administrative transition occurred.

## Completed development checks

The prior verification ran in order: lockfile installation, whole-project lint,
strict type-check, all tests, production build and dependency audit. All passed.
Node reported 26 tests passed, zero failed and zero skipped, including the original
eleven configuration tests. Next.js 16.4.3 built successfully. `npm audit`
reported zero vulnerabilities, including Drizzle, Postgres and Zod.

The useless escape in the SQL-injection test string was removed without changing
the payload or disabling a lint rule. Database integration tests cover normalized
TrxID uniqueness, concurrent duplicate submissions and rate limiting, server-only
prices, injection payloads, request boundaries and generic errors.

With required environment variables unset, `scripts/check-env.mjs` passed its
repository/template guard. Separate runtime checks rejected each missing required
setting. The unconfigured production server retained a listener but returned a
generic HTTP 500, preventing order acceptance. The repository guard verifies blank
template assignments and ignored private files; it is not the runtime env loader.

## Live HTTPS and production HTTP checks

The environment network change was saved and published by the user. A fresh
HTTPS request to `https://challenges.cloudflare.com` returned HTTP 200.

| Request | Actual result |
| --- | --- |
| Valid synthetic order | 201; order `ORD-U6YTP969`, amountExpected 500 |
| Same TrxID again | 409 |
| Same TrxID in different letter case | 409 |
| Extra client `price` field | 400 |
| Official always-fail Turnstile secret | 403 CAPTCHA from real external Siteverify |
| Bad Origin | 403 |
| Wrong content type | 415 |
| GET | 405 with Allow: POST |
| Malformed JSON | 400 |
| Six rapid attempts with extra price | Five 400s, then 429 with Retry-After: 600 |
| Checkout widget under nonce CSP | Pending approval: Chromium reported ERR_CERT_AUTHORITY_INVALID |

The successful response amount matched the product's PostgreSQL price. Its
public shape contains only `orderCode`, `amountExpected`, `status` and
`whatsappLink`, with no internal ID or full customer email.

Fresh local production curl checks also passed for bad Origin (403), wrong content
type (415), GET (405 with `Allow: POST`), malformed JSON (400), and six rapid
attempts with an extra price field (five 400s, then 429 with `Retry-After: 600`).
Rate events were cleared only in the disposable local database between independent
smoke scenarios. A fresh browser
check found matching CSP nonces on all twelve executable scripts,
zero page JavaScript errors and no observed CSP violations. The Turnstile library
request failed with `ERR_CERT_AUTHORITY_INVALID`, so actual widget loading is not
confirmed. Curl and Node trust the existing environment-proxy CA, while Chromium's
NSS store does not. Automatic approval review rejected importing that CA into the
persistent user trust store because it would broaden TLS interception. No trust
change, certificate-verification bypass, captcha bypass, or mock was applied.
The browser/widget check remains pending an approved trust configuration.

All requested live API cases passed using the real external verification endpoint.
This is not a completed-phase or production-readiness claim: the browser/widget
check remains unresolved, and production configuration and deployment assumptions
still require review. Local PostgreSQL service and explicit migration support are
included in the existing CI job; its YAML and check ordering were validated.
Hosted CI is unrun because no push is authorized.

## Remaining assumptions

Confirm the assumed uppercase-alphanumeric, 8–12 character bKash TrxID format
against real records. Confirm Vercel overwrites the selected single-IP header and
that rate limiting behaves correctly across deployed replicas; concurrency has
been exercised against the local PostgreSQL database. Configure real site origin,
Turnstile keys, contact/payment destinations, HMAC secret and least-privilege
server database access before any production use. Catalog and policy pages still
contain draft/sample content. Submitted payment claims require manual verification.
