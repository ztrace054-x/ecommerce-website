# Project plan — source of truth

Last updated: 2026-10-13. Current scope: **authorized marketplace continuation**.

The owner's latest request authorizes audit, backend/admin/customer implementation,
testing, documentation and a review deployment. Earlier phase-specific approval
statements below are historical; preserve the original requirements and history.
See docs/repository-audit.md and docs/architecture-continuation.md for the current
implementation roadmap and decisions.

This plan records the owner's requirements and the preparation needed to build
them safely. Requirements marked **planned** are not implemented security
controls. Design decisions must be settled before their dependent features are
built. Choose simple, safe defaults for routine technical decisions within the
approved scope and record them. Ask the owner only for a true blocker; do not
invent business offerings, credentials, or platform permissions.

## Working rules for every phase

1. Work in small, approved phases, and finish each phase completely: working
   locally, checked, committed, and pushed. A partially completed phase is not
   a finished phase.
2. Do not pause within an authorized phase to ask whether to continue. Ask only
   when a true blocker needs the owner's input, account, key, or business
   permission. Continue independent work while a blocked part is clarified.
3. Build the simplest working MVP that meets the stated requirements. Make and
   report sensible implementation decisions; avoid extra features and complex
   architecture. Required security controls must still work.
4. Verify `npm run dev` starts and serves the application without errors at the
   end of every phase. Run the other checks appropriate to that phase.
5. Make small commits and push the phase branch after each phase. Check the
   remote result. Never merge, deploy, or connect real services automatically.
6. Update **Progress** with **Done**, **Next**, and **Known issues** at every
   phase boundary. If context or time forces a checkpoint, record completed
   work, exact next steps, and failures; commit and push safe progress and tell
   the owner that the phase is incomplete.
7. Give the final report only after completing the authorized phase, then wait
   for the owner's approval before starting the next phase.

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
   It creates a unique order code, such as `ORD-4F7K2A`, and records a price
   snapshot for that order. A client-supplied price must never set the amount.
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
| `submitted` | Valid payment claim received; payment is not yet confirmed. |
| `verified` | Administrator checked and confirmed the actual payment. |
| `delivered` | The verified order's permitted delivery has been completed. |
| `rejected` | Administrator rejected the payment claim and recorded a reason. |
| `refunded` | Administrator confirmed completion of an actual manual refund. |

Normal progression is `submitted` to `verified` to `delivered`; a submitted
claim may instead be rejected. Refund eligibility and other transitions require
an explicit policy before implementation. The server will enforce the approved
transition rules rather than accept arbitrary status values from a browser.

**Phase 2 design decision:** an order code and price must exist before the TrxID is
submitted, but no pre-submission state was specified. Resolve how unpaid order
records should be represented before building the schema. Choose and document
the simplest safe representation that preserves the five requested statuses.
Do not silently add `pending`, `draft`, or another sixth customer-facing status.

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

## 7. Database plan — not a schema implementation

Keep schema definitions and reviewed migrations in `src/db/`. Database access
will run on the server through Drizzle with parameterized queries.

| Planned data | Minimum responsibility |
| --- | --- |
| Products/plans | Name, delivery model, approved offering details, active flag, price and currency |
| Orders | Internal identifier, unique display code, product reference, immutable price snapshot, minimum customer contact fields, approved state representation, timestamps |
| Payment claims | Order reference, normalized TrxID, sender information, submission and manual verification/rejection records |
| Deliveries | Order reference, permitted delivery model, completion record; encrypted voucher payload only when needed |
| Administrator identity/session | Provider-backed identity and server-verified role; final design needs approval |
| Audit events | Actor, action, affected order, timestamp, and minimal non-secret change details |

- Store BDT amounts as integer minor units (poisha) to avoid floating-point
  rounding. Format them for display without trusting a browser calculation.
- Use database unique constraints for order codes and the approved canonical
  TrxID representation; application checks alone cannot prevent concurrent reuse.
- Apply foreign keys, required fields, positive-amount constraints, and approved
  state constraints. Use transactions for related changes.
- Generate order codes securely and retry collisions under a unique constraint.
  A short display code is not an authentication credential.
- Protect customer records and voucher inventory from direct public database
  access. Supabase policies and database roles need explicit review; do not rely
  solely on hiding browser UI or turning off a button.
- Give migration and application access only the privileges each needs. Review
  connection pooling and migration connections before adding Supabase.
- Define customer-record retention and recovery procedures before real data is
  accepted. Do not add a file-upload or screenshot-storage feature by assumption.
- Store ciphertext, nonce, authentication tag, and key version where vouchers
  require them. Key storage, rotation, and redemption safeguards are later work.

**Decisions to resolve before dependent work:** pre-submission order representation;
administrator authentication provider; customer access to their private order
details; confirmed bKash TrxID rules and recipient account/payment method;
duplicate-claim correction policy; refund eligibility; product offerings and
official delivery permissions. Make and document routine technical choices under
the working rules above. Request owner input only where a true blocker remains,
such as unavailable account details or permission to offer a specific product.
Do not invent credentials, recipient details, or platform permissions.

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
corrected the phase order above on 2026-10-11. Phase 1 is now authorized in full.
Finish the authorized phase, report what changed and what passed, then wait for
approval for Phase 2. Do not merge Phase 1 into `main` automatically.

### Phase 1 implementation decisions

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

Updated: 2026-10-13. Status: **marketplace continuation under final verification**.
The latest owner request authorizes the full continuation. The Phase 1 record
below is retained as history; the current checkpoint follows it.

### Done

- Reviewed the repository, README, plan, structure, and existing `phase-0`
  history. Retained the existing foundation commits.
- In Phase 0, created the minimal Next.js App Router and strict TypeScript foundation with
  clear application, component, database, API, authentication, and security
  boundaries. That foundation phase added no customer pages or payment logic.
- Added blank environment placeholders, private-file ignore rules, separated
  server/public configuration, dependency locking and audits, and basic headers.
- Added architecture, local-development, security, and verification guidance,
  eleven repeatable configuration security tests, and GitHub checks.
- Phase 0 is committed, pushed, approved, and merged into `main` by a fast-forward
  after its latest GitHub checks passed. `phase-1` branches from that foundation.
- Recorded the owner's whole-project working rules in this plan and `AGENTS.md`.
- Completion checks passed: environment safeguards, lint, strict types, all
  eleven security configuration tests, and a production build. The dependency
  audit reported zero known vulnerabilities.
- `npm run dev` and `npm start` both served the placeholder on default port 3000
  without application errors. Security headers were verified, and unfinished
  order/payment/login/admin paths returned 404 for GET and POST. Servers were
  stopped after testing. See `docs/phase-0-verification.md` for the evidence.
- GitHub's foundation checks passed for the pushed foundation. The workflow
  now runs on `main` and all `phase-*` branches, with the same read-only checks.
- Corrected the roadmap to the owner's phase order: frontend in Phase 1 and
  database in Phase 2. Recorded the UI-only scope and mock/contact decisions.
- Built the Bangla Home, catalog, four Product/Plan pages, UI-only Checkout,
  Refund/Privacy/Terms/Contact pages, FAQ, and floating WhatsApp icon. Added one
  mock product file, shared components, and a locally served licensed font.
- Lint, strict types, all eleven tests, build, and dependency audit passed.
  Development and fresh production browser checks passed across all thirteen
  main customer route instances at 320, 375, 768, and 1280 pixels.
- Verified navigation, matching mock prices, unknown/repeated product rejection,
  keyboard/FAQ controls, optional WhatsApp, reload/product-change resets, and
  no submission/storage of synthetic input, including with JavaScript disabled.
- Visually reviewed mobile/desktop Home and Checkout. No horizontal overflow,
  unexpected external requests, or application browser/server errors remained.
  Future API/admin/tracking routes still returned 404 for GET and POST.
- Updated README, local instructions, architecture/security notes, boundary
  README files, and `docs/phase-1-verification.md`. No application dependency
  changes, real credentials, payment logic, deployment, or Phase 1 merge added.
- Resumed on 2026-10-12 and rechecked the final SVG navigation polish from a
  clean build. Both production and development browser reviews passed again;
  lint, types, all eleven tests, and the current dependency audit also passed.

### Next

- Wait for the owner's Phase 2 approval before database schema, migrations, or
  seed data. Start from `phase-1`'s verified source and resolve the Phase 2 data
  design decisions. Do not merge Phase 1 or connect live services automatically.

### Known issues

- No unresolved Phase 0 functional errors were found in the completed checks.
- No unresolved Phase 1 functional errors were found in the completed checks.
  An older generated production page was resolved by a clean rebuild; the
  complete production browser review passed afterward.
- Products/prices remain samples. Policies remain drafts; no real WhatsApp
  number or support email is configured. These are documented Phase 1 boundaries,
  not a working payment, database, or support-service integration.
- Recheck official Next.js advisories and apply any required patches before
  deployment. The earlier dated notice could not be independently reverified
  on 2026-10-12; see `docs/security.md`. A clean audit is not proof of safety.
- Authentication, payments, database access, bot verification, and voucher
  encryption are intentionally future work. This is not a production release.
- A zero-cost commercial hosting option still needs review before any launch.


## Continuation checkpoint — 13 October 2026

### Done

- Audited all 53 original files and reproduced baseline checks/build and eleven tests.
- Retained Next.js, Bangla pages, plain CSS, local font and labelled sample UI.
  Reconciled the unmerged Phase 2 head `8170a19cedfde1d0a169127c558cb4e05aabdf4b`:
  original PostgreSQL tables/migrations, whole-BDT prices, eight-character codes,
  10-character TrxIDs, pending records, encryption, terminal tools and tests stay.
  Added web RPCs/columns/tables only through `0002_marketplace`.
- Implemented reviewed SQL schema/grants/RLS, DB-level canonical TrxID uniqueness,
  immutable quote/order snapshots, transaction locking, idempotency, optimistic
  status versions, internal notes, audit history and atomic shared rate limits.
- Implemented product/quote/claim/private-tracking APIs and provider-backed admin
  MFA login/session/logout, overview, order/search/details/status/notes, products
  and audit. Original terminal identities default to inactive for web login.
- Added real checkout flow, private tracking, admin UI, loading/error states, FAQ
  preview and configurable support without inventing destinations or actual offers.
- Passed all 69 tests: 29 original unit/configuration, 25 marketplace and 15
  retained SQL/actual-terminal regressions. Verified populated Phase 2 upgrades,
  MFA denial, full quote/claim/verify/deliver flow, rollback/privacy/anti-abuse.
- Environment checks, lint, strict types, journal check, both production builds,
  migrations/seeds/reruns and database-backed port-3000 HTTP smoke passed.
- Created a private review hosting resource and adapter using the same source;
  kept checkout disabled and configured no real database/payment/customer records.

### Next

- Push continuation branch and review PR, synchronize hosting source and deploy.
- Record exact final verification and deployment result without overstating completion.

### Known issues / activation blockers

- Actual Supabase credentials/admin identity, Turnstile keys, bKash recipient/method,
  approved products/prices, support contacts and reviewed policies are not supplied.
- PGlite tests use one multiplexed local PostgreSQL backend and mocked provider transport.
  Independent-connection concurrency and real-provider staging checks remain required.
- Supported control-browser is unavailable in this managed environment; rendered
  browser/mobile QA of the new flows is not claimed.
- Official Next.js upstream update is scheduled for 14 October; affected versions
  and upgrade instructions are pending. Review and patch before commercial launch.
- Standard Next.js runtime audit is clean. Full audit flags one unresolved
  `braces` advisory across six hosting build-chain entries. No patched release
  is available; the full CI audit is kept blocking and the PR must remain draft.
- No voucher inventory, automated payments/emails or policy-dependent refund action
  is enabled. No default passwords, payment bypasses or unauthorized public launch.
