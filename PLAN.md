# Project plan — source of truth

Last updated: 2026-10-11. Current scope: **Phase 0 only**.

This plan records the owner's requirements and the preparation needed to build
them safely. Requirements marked **planned** are not implemented security
controls. Questions marked **decision required** must be answered before their
dependent features are built. Do not add business features by assumption.

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

**Decision required:** an order code and price must exist before the TrxID is
submitted, but no pre-submission state was specified. Confirm how unpaid order
records should be represented before building the schema. Do not silently add
`pending`, `draft`, or another sixth status.

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

Product approval must check the exact offering before publication. No example
product inventory or subscription promises are created in Phase 0.

## 6. Technology stack

| Area | Choice and scope |
| --- | --- |
| Application | Next.js App Router, TypeScript in strict mode |
| Interface | React and plain CSS initially; no unnecessary component framework |
| Database | PostgreSQL, with Supabase free tier planned for later authorized use |
| ORM | Drizzle, selected from the owner's permitted alternatives |
| Bot protection | Cloudflare Turnstile; browser site key and server secret stay separate |
| Email | Resend free tier; integration is deferred |
| Source control | Connected GitHub repository; isolated `phase-0` branch |
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

**Decisions required before dependent work:** pre-submission order representation;
administrator authentication provider; customer access to their private order
details; confirmed bKash TrxID rules and recipient account/payment method;
duplicate-claim correction policy; refund eligibility; product offerings and
official delivery permissions. Do not invent values for any of these.

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
| 1 — Data design | Resolve schema-blocking questions, define Drizzle schema/migrations and safe local fixtures | Review constraints, price precision, concurrency, data privacy, and state design; no live Supabase connection |
| 2 — Administrator access | Agree on and prepare a reviewed identity/session system with isolated local tests | Authentication, authorization, session and CSRF checks pass; no secret-based login shortcut |
| 3 — Catalog and order creation | Approved products, requested contact form, server prices, order code and payment instructions | Tampered prices rejected, inputs limited, private customer access agreed and tested |
| 4 — TrxID submission | Confirmed format, duplicate constraints, durable rate limits, Turnstile boundary, WhatsApp link | Concurrent duplicates, replay, rate limits, missing configuration, and bot-check failures tested |
| 5 — Manual verification | Authenticated administrator view and permitted verified/rejected transitions | Manual bKash check required, transition rules enforced, actor and actions recorded |
| 6 — Delivery and refunds | Permitted invites/services, encrypted voucher delivery where approved, Resend preparation, approved manual refund states | No credentials shared, delivery access private, encryption and repeated-action tests pass |
| 7 — Final review and preparation | Full mocked/local flow, security review, runbooks and hosting eligibility | Reviewable release candidate only; separate explicit permission needed for any live connection or deployment |

Stop at the end of each phase and report what changed and what passed. Phase 1
requires a new explicit approval. Phase 0 must not create customer pages,
catalog data, order APIs, payment logic, login routes, or a working voucher store.

## 10. Testing strategy

### Foundation checks

Run environment-repository checks, ESLint, TypeScript route/type generation, and
the production build. Run the repeatable `npm test` configuration security suite
as part of `npm run check`; use synthetic inputs and disposable Git fixtures.
Start local development and production servers and check
that `/` loads the placeholder. Confirm planned payment and admin routes return
404 rather than exposing unfinished endpoints. Verify basic response headers.

Check that `.env` and `.env.local` are ignored and `.env.example` is tracked with
blank values. Review staged files for secrets. Audit production and development
dependencies; record any unresolved advisory rather than call the project safe.
Test the environment guard with non-secret synthetic values to confirm blank
configuration is rejected without revealing supplied values.

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
