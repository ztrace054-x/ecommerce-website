# Marketplace architecture — continuation

The existing Next.js App Router application, Bangla interface and plain CSS are
retained. No starter app replaces them. The audit is in `repository-audit.md`.
The current owner request authorizes the Phase 2 foundation audit and additive
database/API work. Deployment, publishing and Vercel connection are paused.
Earlier deployment authorization is historical. Existing admin UI is preserved.

## Database and request boundaries

PostgreSQL remains the database. `src/db/schema.ts` describes it with Drizzle.
Original migrations `0000_phase_2_schema.sql` and `0001_order_price_guards.sql`
are unchanged. `0002_marketplace.sql` adds checkout/session/note/rate tables,
columns, privileges and transactional RPCs to the existing schema. Apply the
journal with the existing migration CLI, never schema push or replacement DDL.
Do not create or modify provider-owned `auth.users` through these migrations.

`0003_phase_2_foundation` adds BDT currency checks, generated category/payment
status, an explicit admin role and a private `payment_claims` view. It replaces
only the three existing admin/session guards to require role `admin`; their
restricted grants remain intact. No existing migration or data row is replaced.

Web marketplace requests use the Supabase HTTP interface, with a server-only service
credential. This supports both Next.js on Node and the Sites Worker without a
raw TCP connection. The browser never has a Supabase key or direct database
access. All application tables have RLS enabled and no anonymous/authenticated
table grants; application RPCs are executable only by the server service role.
RPCs use `SECURITY INVOKER`, an empty search path, qualified relations and bound
parameters. They check administrator membership for every admin operation.

| Table                  | Responsibility                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `products`             | Original products, whole-BDT integer prices and active flag; additive storefront slug/metadata |
| `ai_checkout_sessions` | Pre-payment code, hash of random access token, price/product and recipient snapshots, 24-hour expiry; no customer PII     |
| `orders`               | Original whole-BDT price, 10-character unique canonical TrxID and status/timestamps; additive snapshots/private tracking |
| `payment_claims` (view) | Read-only claim projection with sender, status and nullable review actor/time/audit reference; security invoker |
| `admin_users`          | Original scrypt identities, encryption/lock fields; additive provider identity and inactive-by-default web allowlist |
| `ai_admin_sessions`    | Hashed provider token, expiry and immediate application revocation                                                        |
| `audit_logs`           | Original actors/order/IP history; additive target/details, append-only runtime admin events |
| `ai_order_notes`       | Internal notes excluded from customer tracking                                                                            |
| `ai_rate_limits`       | Atomic fixed-window counters shared across all server instances                                                           |
| `delivery_codes`      | Original encrypted voucher table, preserved; no web inventory or delivery operation enabled |

The original Node/Compose catalog and CLIs retain Drizzle/node-postgres access.
When only `DATABASE_URL` is configured, the storefront reads that database and
labels it as a sample preview. A configured Supabase failure never switches to
Node/sample data. The review Worker has no TCP database configuration.

Products/orders explicitly constrain currency to BDT. `products.category` is
generated from existing metadata, avoiding changes to the product write path.
`orders.payment_status` is generated from the existing status: pending means
unpaid; delivered keeps payment verified. The claim view uses the existing
unique `orders.trx_id` and audit foreign keys. Legacy reviews without an audit
retain NULL attribution; no administrator or payment proof is invented.

`price_bdt`/`amount_expected` remain integer whole BDT. HTTP DTOs and new quote
sessions use integer poisha with exact ×100 conversion and whole-BDT checks.
The original eight-character order-code suffix and 10-character TrxID format
are retained. Existing `pending` orders are preserved; new web quotes stay in
the checkout table until a claim creates a `submitted` order.

## Customer flow

1. The server reads the active catalog. When no database is configured, the
   original four samples remain visible and clearly labelled. A configured
   database outage returns an error; it never becomes a sample offer.
2. A same-origin quote request accepts only a product ID. The database loads its
   price and creates a checkout session/code. The server returns a 256-bit random
   token and instructions. Only the hash is stored. Display prices never set
   the amount; an existing quote retains its price during its validity window.
3. The customer pays outside the site and submits name, email, sender number,
   optional WhatsApp, TrxID, terms consent and a Turnstile token.
4. Server validation, actual body-size limits, origin checks, durable rate limits
   and provider-verified hostname/action checks run before the atomic claim.
5. The database locks the checkout session and creates one `submitted` order.
   Unique constraints prevent TrxID reuse across sessions. Identical retries
   return the same order; a conflicting retry is refused.
6. Tracking requires code, matching email and the private access key in a POST
   body. It exposes only status, service, amount, timestamps and an explicit
   customer message. It exposes no payment/contact details or internal notes.

Checkout sessions are not customer-facing orders. This preserves the original
claim statuses without creating new unpaid order rows. Refund operations and voucher
inventory are not enabled: the existing offering is the four service categories.
No account-sharing, credential sale or third-party password feature exists.

## Administrator flow

Supabase Auth verifies web administrator passwords and handles bcrypt hashing.
Login also challenges and verifies an enrolled TOTP factor before issuing the
application session. Password-only and unenrolled logins cannot obtain a session.
The retained terminal CLI stores a scrypt hash and creates an inactive identity;
it is not a web login or a substitute for provider enrollment.
There is no public registration route or `ADMIN_SECRET` login. A successful
provider login must also pass the active database allowlist and the `admin` role.
The reserved `support` role cannot open/reuse admin sessions or invoke admin
operations; scoped support permissions require later review. The provider token
stays in a short-lived `HttpOnly`, `SameSite=Strict` cookie (`Secure` over HTTPS).
Every admin API verifies it with the provider and checks the unexpired,
unrevoked application session. Sessions are capped at one hour; expiry requires
login again. Disabling an admin or logging out revokes application access.

Status changes lock the order, verify the expected version and enforce only:
`submitted -> verified/rejected`, `verified -> delivered`. Verification requires
an explicit manual confirmation and matching actual amount. Rejection requires
a customer-visible reason. Delivery requires an explicit confirmation. Status,
internal note and audit event commit together. No endpoint treats a TrxID as
payment proof. Admin product edits cannot change existing order snapshots.

## Hosting

`npm run dev`, `build:next` and `start` preserve standard Next.js development.
`npm run build` also builds a Worker from the same `src/app` using the Vinext
adapter, the supplied Sites build integration and `vite.config.ts`. The adapter
adds hosting support; it does not create a second application or replace pages.
Site identity lives in `.openai/hosting.json`; credentials never do.
The review Site remains private with checkout disabled and no customer database.

## References

- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/auth/password-security
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://github.com/cloudflare/vinext
