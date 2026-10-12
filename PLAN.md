# Project plan — source of truth

Last updated: 2026-10-12. Current scope: **Phase 2 — database layer**.

This plan records the owner's requirements and the preparation needed to build
them safely. Requirements marked **planned** are not implemented security
controls. Design decisions must be settled before their dependent features are
built. Choose simple, safe defaults for routine technical decisions within the
approved scope and record them. Ask the owner only for a true blocker; do not
invent business offerings, credentials, or platform permissions.

## Working rules for every phase

1. Finish each approved phase completely: working locally, checked, committed,
   pushed, and merged into `main` after the checks pass. Do not deploy or connect
   live services. Wait for approval before the next phase.
2. Do not ask whether to continue mid-phase. Ask only for a true blocker.
   Make simple, safe MVP decisions and record them; do not add unrequested features.
3. Use strict Zod validation for every server input. The database supplies prices.
   Never accept a browser's price, status, verification decision, or admin role.
4. Test every implemented critical rule, including TrxID normalization/uniqueness,
   database prices, order-code collisions, and encryption. Test rate limits,
   administrator authentication, and status transitions with their later phases.
5. Review changes as an attacker and fix findings before reporting completion.
   Security-critical code must not contain fake implementations or bypasses.
6. End each phase with working `npm run dev`, passing lint, typecheck, build and
   tests, small commits, a pushed branch, and a checked merge into `main`.
7. Keep README setup, environment variables, commands, completed and remaining
   work current. Update Progress with Done / Next / Known issues. A forced
   checkpoint is incomplete work and must be reported as such.
8. Never request or commit real secrets. Keep `.env.example` values blank;
   the owner supplies local configuration privately.

## 1. Project purpose

Build an e-commerce website for Bangladesh that accepts requests for permitted
AI products and services. Customers pay manually using bKash. An administrator
checks the incoming payment in their own bKash app before approving delivery.

The owner is a beginner preparing for SSC and has no budget. Explain changes in
plain language, keep the structure small, and build one approved phase at a
time. Never deploy, connect real services, generate real secrets, or start the
next phase without the owner's approval.

## 2. Problem statement

Some Bangladeshi customers cannot purchase AI subscriptions because they lack
international payment cards. This project offers permitted purchase assistance
and related services through a familiar local payment method. It must not solve
that problem by sharing accounts or violating platform terms.

Manual payment verification is the trust boundary. A valid-looking TrxID proves
only that the customer submitted a claim. Only an authenticated administrator
who checks the actual payment may mark it verified.

## 3. Required customer and administrator flow

1. Customer opens the website and selects a published product or plan.
2. Customer supplies name, email, bKash sender number, and an optional WhatsApp
   number. Do not request third-party account passwords.
3. Server loads the selected product and its current amount from the database.
   It creates a unique order code, in format `ORD-XXXXXXXX`, and records a price
   snapshot for that pending order. A client-supplied price must never set the amount.
4. Server displays the configured bKash recipient number, exact BDT amount, and
   order code. Payment happens outside the website in bKash.
5. Customer submits the TrxID for that order.
6. Server checks the confirmed TrxID format, duplicate use, request rate limits,
   and a Cloudflare Turnstile token through server-side verification.
7. Only a valid claim is recorded with status `submitted`.
8. Customer sees **Confirm on WhatsApp**. The button opens a fixed, configured
   `wa.me` destination with the order code in an encoded message. It does not
   automatically send a message or change verification status.
9. Administrator logs in and compares the claim with the actual incoming payment
   in the bKash app, including recipient, amount, TrxID, and sender details.
10. Administrator verifies or rejects the claim. Record who acted and when.
11. After verification, administrator delivers the approved service, official
    invite, or authorized voucher.
12. Administrator marks the order `delivered` only after delivery happens.

Allowed customer-facing statuses:

| Status | Meaning |
| --- | --- |
| `pending` | Order and database price recorded; no TrxID submitted yet. |
| `submitted` | Valid payment claim received; payment is not yet confirmed. |
| `verified` | Administrator checked and confirmed the actual payment. |
| `delivered` | The verified order's permitted delivery has been completed. |
| `rejected` | Administrator rejected the payment claim and recorded a reason. |
| `refunded` | Administrator confirmed completion of an actual manual refund. |

Normal progression is `pending` → `submitted` → `verified` → `delivered`.
The owner explicitly added `pending` in Phase 2, resolving the Phase 0 open
question. Pending rows have a null TrxID and null payment timestamps. A submitted
claim is not payment approval. Administrator rejection/refund transitions and
customer access protection must be finalized and tested in their API/admin phases.
No administrator transition endpoint is implemented in Phase 2.

## 4. Delivery rules

### A. Customer's own account

Use the customer's email through an official platform invite, team, or gift
feature only when that exact platform and plan permit this business use. The
existence of a team invite does not by itself grant permission to resell seats.
Never request, store, or transmit their third-party account password.

### B. Official gift card or voucher

Purchase only from the official platform or an authorized reseller. Confirm
region and redemption eligibility before offering the product. Store codes
encrypted on the server; release only to the authorized customer after payment
verification. Use an authenticated encryption scheme and an external key;
never put plaintext codes in browser bundles, public tables, logs, or Git.

### C. Services

Offer only the requested service categories: setup, prompt training, chatbot
building, and website building. Record actual delivery completion manually.

## 5. Allowed and forbidden business models

| Allowed, subject to the platform's current terms | Forbidden |
| --- | --- |
| Official permitted invitations/gifts to the customer's own account | Selling pre-made accounts |
| Authorized gift cards/vouchers | Selling stolen or shared credentials |
| Setup and prompt training | Requesting passwords to customers' third-party accounts |
| Chatbot and website building | Features that evade platform restrictions or violate terms |

Product approval must check the exact offering before publication. Phase 1 uses
clearly labelled mock examples of the four allowed service categories only.
Those sample prices and descriptions are not live offers or approved inventory.
No subscription resale promises or invented contact details are permitted.

## 6. Technology stack

| Area | Choice and scope |
| --- | --- |
| Application | Next.js App Router, TypeScript in strict mode |
| Interface | React and plain CSS initially; no unnecessary component framework |
| Database | PostgreSQL, with Supabase free tier planned for later authorized use |
| ORM | Drizzle, selected from the owner's permitted alternatives |
| Bot protection | Cloudflare Turnstile; browser site key and server secret stay separate |
| Email | Resend free tier; integration is deferred |
| Source control | Connected GitHub repository; one branch for each authorized phase |
| Hosting preparation | Standard Next.js build compatible with Vercel; no deployment |
| Local runtime | Node.js 24 LTS with npm and a committed lockfile |

Install database, authentication, Turnstile, and email adapters only when their
phase needs them. Empty credentials must not trigger a connection or a fallback
that allows protected actions. Local checks need no real service accounts.

Commercial hosting eligibility is unresolved: Vercel's free Hobby plan is for
non-commercial personal use. Its technical compatibility does not establish a
zero-cost commercial launch. Check current provider terms and quotas before
selecting or connecting any live hosting service.

## 7. Database design and resolved questions

Drizzle is retained because its TypeScript schema keeps database/application
fields aligned, its SQL migrations are reviewable in Git, and its PostgreSQL
queries/transactions parameterize data without another service.

| Table | Responsibility |
| --- | --- |
| `products` | Product details, positive integer BDT price, A/B/C delivery type, active flag, timestamps. |
| `orders` | Unique display code, product reference, immutable database price snapshot, minimal contact fields, nullable unique canonical TrxID, state and timestamps. |
| `delivery_codes` | Encrypted official voucher inventory; each used code references one matching product/order. |
| `admin_users` | Canonical unique email, salted scrypt password hash, encrypted TOTP secret after enrollment, failed-login/lockout fields. |
| `audit_logs` | Administrator/action/order references, minimal IP and timestamp; no passwords, voucher plaintext, or payment payloads. |

### Phase 2 decisions

- **Pre-submission order:** use the owner's explicit sixth status `pending` with
  no TrxID. Submission later atomically sets the canonical TrxID, submitted time,
  and `submitted` state. No separate payment-claim table is needed for the MVP.
- **Money:** follow the new `price_bdt` / `amount_expected` requirement: whole BDT
  integers, not Phase 1 poisha. Positive PostgreSQL integers avoid floating point.
  The creation transaction locks the active product row and copies its current
  price. Reject client amount/status/code fields. Existing orders keep their price.
- **Product URLs:** use the product UUID in the existing `[slug]` route and
  checkout selector, avoiding extra schema/presentation columns. Product details
  come from database descriptions; delivery guidance derives from A/B/C only.
- **Order code:** exactly eight cryptographically random unambiguous characters
  after `ORD-`; database UNIQUE is authoritative, with bounded conflict retries.
  This display code is not a credential. Private tracking needs separate access
  protection in Phase 4; a code alone must never expose private order data.
- **TrxID:** trim/uppercase and validate a conservative 10-character ASCII
  alphanumeric storage format. Enforce both canonical format and UNIQUE in
  PostgreSQL. Assigned IDs cannot be changed/released. Confirm the actual supported bKash payment method/TrxID format
  before Phase 3 accepts real claims; format never proves payment.
- **Seed:** four synthetic examples: two active service examples (C), and
  inactive A/B examples pending exact platform/region/authorization review.
  No admins, voucher codes, credentials, or customer orders are seeded. Re-running
  the seed inserts missing fixed IDs without overwriting edited products.
- **Administrator provisioning:** terminal-only creation with hidden password
  confirmation and a salted memory-hard scrypt hash. No shared ADMIN_SECRET login.
  TOTP is nullable only before Phase 5 enrollment; an unenrolled row must never
  receive an administrator session. Phase 2 has no login/auth endpoint.
- **Encrypted storage:** versioned AES-256-GCM payload with a random 12-byte IV,
  16-byte authentication tag, and authenticated record/purpose context. The
  external ENCRYPTION_KEY must decode canonically to exactly 32 bytes. Missing,
  malformed, wrong, or tampered keys/data fail closed without logging payloads.
- **Privacy/roles:** enable RLS with no public policies for all five tables. Use
  server-only database access. Review least-privilege runtime/migration roles,
  Supabase TLS/pooling, retention, backups, and key rotation before live use.
  Local development uses a localhost-only PostgreSQL Docker Compose service.

Remaining business decisions before dependent features: exact recipient bKash
account/payment method and TrxID rules; approved products/platform permissions;
customer private tracking access; duplicate-claim correction/refund policy;
retention and recovery procedures. No live credentials or permissions are invented.

## 8. Security requirements

### Implemented or checked in Phase 0

- TypeScript strict mode, additional indexed-access and optional-property checks,
  ESLint, and separate application/server folders.
- `.env.example` with blank values only; environment files and key files ignored
  by Git. Do not create real secrets for this phase.
- A server-only environment accessor that rejects missing values when used and
  never includes secret values in error messages.
- An explicit public environment module exposing only the future Turnstile
  public site key. No server keys are exported to browser configuration.
- A repository check for committed/unignored environment files and non-empty
  template values. This is an environment safeguard, not a full secret scanner.
- Exact direct dependency versions, a committed lockfile, and dependency-audit
  commands. Review advisories; do not run forced major upgrades blindly.
- Basic response headers and development servers restricted to localhost.
- GitHub checks with read-only permissions, pinned action commits, and no real
  service credentials or deployment steps.

### Required later, before protected features are usable

- Validate every incoming field on the server with length and format limits.
  Accept only expected fields; protect request sizes and do not echo sensitive
  input in errors or logs.
- Authorize each server handler/action, including every administrator mutation.
  A layout, route prefix, or browser-hidden button is not sufficient protection.
- Use a reviewed authentication system, secure sessions, expiry/revocation,
  `HttpOnly` and appropriately `Secure`/`SameSite` cookies, and CSRF/origin checks.
  `ADMIN_SECRET` is reserved for a reviewed future server purpose; it must never
  become a shared admin password, URL token, or login bypass.
- Verify Turnstile on the server. Reject missing, invalid, expired, replayed, or
  wrong-context tokens. Network/configuration errors must deny protected actions.
- Use durable atomic rate limits suitable for multiple server instances. A
  process-local map is not production protection. Confirm trusted client-IP
  forwarding rules for the chosen host.
- Enforce TrxID uniqueness transactionally after confirmed normalization. Rate
  limits and Turnstile do not themselves prove that a payment happened.
- Keep prices and recipient configuration server-controlled. Prevent repeated
  submissions or deliveries from creating duplicate side effects.
- Require manual bKash verification before fulfillment; neither screenshots,
  email messages, nor WhatsApp confirmations can substitute for that check.
- Encrypt voucher storage with authenticated encryption and fresh nonces. Keep
  keys out of the database, repository, client bundle, and logs. Plan rotation.
- Keep order viewing and delivery access private. Knowing an `ORD-...` display
  code alone must not expose personal information or a redeemable voucher.
- Configure and test a suitable Content Security Policy and HTTPS/HSTS before
  public use, including the future Turnstile script/frame requirements.
- Use minimal redacted audit records, reviewed retention, and recovery procedures.
  Sanitize future email/WhatsApp content and restrict links to approved hosts.

All of these later controls must be tested before the associated feature can
handle real customers, payments, vouchers, or administrator sessions.

## 9. Development phases and approval gates

| Phase | Scope | Exit requirements |
| --- | --- | --- |
| 0 — Foundation | Minimal local Next.js app, folder boundaries, documentation, empty environment template, repository checks | Types, lint, build, local smoke checks, dependency audit, small commits on `phase-0`; no real integrations |
| 1 — Frontend customer pages | Home, Product/Plan, Checkout UI, Refund/Privacy/Terms/Contact pages, FAQ, floating WhatsApp icon; one mock product file | Mobile-first Bangla UI, navigation works, sample prices clearly labelled, no payment or personal-data submission; committed and pushed on `phase-1` |
| 2 — Database | Drizzle/PostgreSQL schema, reviewed migrations, and safe seed data | Resolve state design; verify constraints, price precision, privacy, and safe local fixtures; no live Supabase connection without authorization |
| 3 — Order API | Server validation, server prices, rate limiting, Turnstile, secure order codes, payment-claim/TrxID submission boundary | Test tampered prices, duplicate claims, replay, atomic limits, invalid input, and unavailable services; no automatic payment approval |
| 4 — Order Track page | Private customer access to the agreed order status/details | Order-code guessing must not expose personal data or delivery secrets; authorization and privacy checks pass |
| 5 — Admin panel | Reviewed login, 2FA, order management, audit log, manual verification and permitted delivery/refund records | Authentication, authorization, session/CSRF, 2FA, and state transitions tested; manual bKash verification required; safe encrypted vouchers where used |
| 6 — Email and WhatsApp | Requested email templates and configured `wa.me` links | Redacted/escaped content, correct recipient, and approved link destination; mocked tests; no automatic WhatsApp messages |
| 7 — Security hardening and self-review | Review every implemented boundary, headers, access policy, encryption, anti-abuse, dependency advisories, and failure handling | Resolve findings before real use; no unreviewed authentication or payment shortcut |
| 8 — Tests and documentation | Complete feature/integration/end-to-end tests, README, and deployment guide | Synthetic data only, full flow verified, beginner instructions reproducible, hosting eligibility reviewed; a guide does not authorize deployment |
| 9 — Final cleanup and push | Remove dead code/placeholders, final checks, final documentation and source review | Working local application, clean commits, pushed release candidate; live services/deployment require separate explicit authorization |

The owner approved Phase 0, authorized its merge after passing checks, and
corrected the phase order above on 2026-10-11. Phase 1 is approved and merged after lint, typecheck, tests, build, dependency
audit, and development browser checks. Phase 2 is now authorized in full. Finish
it, merge after passing checks, report the result, then wait for Phase 3 approval.

### Phase 1 implementation decisions (historical)

Phase 2 replaces the temporary mock file/poisha prices/slug routing with the
database design above. The following records the original frontend scope.

- Use one Next.js application and plain CSS; no UI framework, external font requests,
  cart, customer registration, search, or extra sales features.
- Bundle the free Noto Sans Bengali variable font locally for readable Bangla
  on every device. Include its license; keep Latin text on system fallbacks.
- Keep mock products in `src/data/mock-products.ts`. Use examples of setup,
  prompt training, chatbot building, and website building only. All prices are
  clearly samples, stored as integer poisha and formatted in Bangla.
- Home links to `/products`; product details live at `/products/[slug]`, and
  `/checkout?product=<slug>` selects a known mock product. Query prices are
  ignored. These are presentation values, not authoritative payment amounts.
- Checkout has labelled fields for name, email, bKash sender number, and optional
  WhatsApp number. It may check native input validity locally but must not send
  or store input, create an order, generate a code, ask for a TrxID, or show a
  bKash recipient. Use synthetic input during testing.
- Policy pages are clearly draft content for review before real use. Do not
  invent refund deadlines, fees, legal guarantees, or business contact details.
- With no WhatsApp number supplied, the floating icon links to the Contact
  page's WhatsApp section. A real destination is deferred to Phase 6.

## 10. Testing strategy

### Foundation checks

Run environment-repository checks, ESLint, TypeScript route/type generation, and
the production build. Run the repeatable `npm test` configuration security suite
as part of `npm run check`; use synthetic inputs and disposable Git fixtures.
Start local development and production servers and check
that `/` loads the current approved interface. Confirm planned payment and admin routes return
404 rather than exposing unfinished endpoints. Verify basic response headers.

Check that `.env` and `.env.local` are ignored and `.env.example` is tracked with
blank values. Review staged files for secrets. Audit production and development
dependencies; record any unresolved advisory rather than call the project safe.
Test the environment guard with non-secret synthetic values to confirm blank
configuration is rejected without revealing supplied values.

### Phase 1 frontend checks

Verify Home, catalog, every mock product detail, checkout selection/empty state,
policies, Contact, FAQ, and not-found routes in development and production.
Check mobile/tablet/desktop layouts, visible focus, associated field labels, one
main landmark and descriptive titles, and keyboard-operated FAQ sections.
Use synthetic checkout input to confirm local validity feedback and clearing
on reload/product change, without requests, URL leakage, or browser storage.
Reject unknown/repeated product selectors; ignore query-supplied prices. The
floating icon must reach Contact until a real WhatsApp number is supplied.

### Tests added with later features

- Unit tests for independent validation rules, money handling, allowed state
  transitions, and encryption authentication/round-trip behavior.
- Integration tests against an isolated local PostgreSQL database for unique
  constraints, transaction rollback, concurrent claims, and role boundaries.
- HTTP/route tests for authorization, CSRF/origin checks, incorrect or extra
  fields, size limits, rate limiting, bot-verification failures, and privacy.
- End-to-end tests using synthetic customer data and mocked Turnstile/Resend:
  selection, server quote, valid submission, manual verification, delivery,
  rejection, and the approved refund flow.
- Explicit attacks: frontend price manipulation, duplicate TrxIDs under races,
  order-code guessing, unauthorized admin actions, repeated delivery requests,
  leaked voucher access, malicious input, and unavailable external services.

Never use real payments, real customer details, real vouchers, or production
credentials in development tests. Record proof of actual checks and limitations;
a successful build or a clean dependency audit is not a complete security review.

## Progress

Updated: 2026-10-12. Status: **Phase 2 complete and merged into main after passing checks**.

### Done

- Phase 0 foundation and Phase 1 Bangla customer pages are approved and merged
  into main. Phase 1 was rechecked with lint, types, 11 tests, build, audit and
  default-port development browser checks before its approved fast-forward merge.
- Recorded the owner's permanent complete/test/review/push/merge/document rules.
- Resolved the old schema questions using pending orders, whole integer BDT,
  UUID product URLs, strict canonical unique claims, and terminal admin identities.
- Implemented all five PostgreSQL/Drizzle tables, enums, foreign keys, indexes,
  RLS with no public policies, state/timestamp checks and reviewed migrations.
- Added active-product locking and independent DB price-copy/immutable quote
  guards, plus immutable assigned TrxIDs found during attacker review.
- Added strict Zod server contracts, parameterized data access, redacted errors,
  lazy verified-TLS connection preparation, crypto-secure order-code collision
  retries, context-bound AES-256-GCM and salted scrypt password hashing.
- Added local PostgreSQL 17 Compose setup with health check/persistent volume,
  dedicated test DB initialization, non-destructive A/B/C seed and hidden terminal
  admin identity creation. A/B samples stay inactive; no credentials/vouchers seeded.
- Replaced mock product reads/file with active DB projections on existing pages,
  kept the UI-only checkout, and added a generic non-secret catalog error state.
- Local migrations/seed ran twice successfully. Development smoke and production/
  development browser reviews passed across 11 customer route instances at
  320/375/768/1280px: navigation, headers, DB prices, inactive/invalid selectors,
  preview feedback/reset/no-JS, keyboard/FAQ and no input transmission/storage.
- All 44 tests passed with zero skipped: 29 unit/configuration and 15 database/
  terminal tests. Lint, strict types, build, migration checks and audit passed.
- Native PostgreSQL 17 Docker Compose CI passed the documented fresh startup,
  migrations, seed/admin tests, concurrent constraints, RLS, all checks, and
  default-port DB-backed dev smoke. Evidence: GitHub Actions run 38215812387,
  code/docs commit d3121a2f4bbac2a29513edf95c032c68497181d6.
- Verified all 88 tracked files match the tested/pushed GitHub tree. Phase 2 uses
  small commits on phase-2 and a checked fast-forward merge into main. No force
  push, history rewrite, deployment, real credentials or live integrations.
- Fixed the migration-tool esbuild advisory with a compatible patched dependency
  override; migration generation/checking and audit pass (zero known advisories).
- Updated README, database/local/architecture/security docs and boundary guidance.
  No real service/account/key, payment API, login, deployment or later-phase feature.

### Next

- Wait for the owner's approval before Phase 3: complete server Order API with
  request validation, authoritative quotes, atomic durable rate limits, real
  fail-closed Turnstile verification and immutable canonical TrxID submission.
- Confirm the supported bKash method/TrxID format before accepting real claims.
  Resolve private tracking and correction/refund policy before dependent phases.
  Never request real secrets; the owner fills private configuration locally.

### Known issues

- No unresolved Phase 2 functional/check failures remain. Local browser/engine
  testing used PGlite because this workspace cannot run native Docker/PostgreSQL.
  Native PostgreSQL 17 Compose CI separately passed; do not confuse the two.
- No real remote Supabase/certificate/pooler, payment, Turnstile or Resend endpoint
  was connected or tested. These require their authorized integration checks.
- Full terminal automation uses Linux util-linux script; use Linux/WSL2 locally.
- Products remain examples and policies drafts; no contact/payment details or
  exact A/B platform permissions have been supplied. Conservative 10-character
  TrxID format must be confirmed for the actual bKash method before real claims.
- Auth/2FA, bot protection, atomic request limits, private tracking, authenticated
  status changes and real delivery are later phases. No real transactions yet.
- Commercial hosting eligibility, production DB privileges, retention/backups,
  key recovery/rotation and current advisories need pre-launch review.
