# Customer order submission

This branch adds only submitted payment claims. A claim, including a plausible
TrxID, never proves that money was received. No administrator transitions,
tracking, delivery, email, customer accounts or authentication are implemented.

## Database and local development

No tables, ORM, migrations or validation library existed at the start. Drizzle
(the ORM selected in PLAN.md) now uses the postgres driver. Zod validates input.
`src/db/migrations/0001_orders.sql` creates products, orders, audit_logs and
order_rate_events. Explicit `npm run db:migrate` runs checked-in DDL transactionally
with a migration lock and checksum; it never runs during build or request handling.
The unique order_code constraint supplies its index. Row-level security has no
anonymous policies; only a restricted server-side connection may access orders.
Do not expose database credentials or add public Supabase policies. Use a
server-only, least-privilege runtime role with table/sequence access and the
necessary RLS policy; use a separate privileged migration role. No automatic
provisioning of a live database takes place here.

For isolated local testing:

```
docker run --name ecommerce-phase4-test -d -p 127.0.0.1:55432:5432 \
  -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=ecommerce_test postgres:17
export DATABASE_URL=postgres://postgres@127.0.0.1:55432/ecommerce_test
npm ci
npm run db:migrate
ALLOW_LOCAL_SEED=1 npm run db:seed:local
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

Trust authentication is for this loopback-only disposable database only. Tests
refuse remote databases or database names that do not end in `_test`. They delete
orders, audit logs and rate events in that database. Never point tests at customer
data. `TEST_DATABASE_URL` optionally overrides the loopback test URL. The seed
adds two synthetic products and requires an explicit opt-in and local database;
it refuses NODE_ENV=production. No seed is invoked by installation or deployment.

## Required configuration

All committed `.env.example` assignments stay blank, preserving the existing
privacy guard and its eleven tests. Configure actual values securely outside Git.
Runtime initialization validates configuration before accepting orders. A
production server with required settings absent returned a generic HTTP 500;
Next.js retained its listener after reporting the instrumentation error:

- DATABASE_URL: PostgreSQL server connection; use the provider's authenticated
  TLS configuration and certificate verification for remote connections.
- IP_HASH_SECRET: at least 32 random characters for HMAC-SHA256, kept server-only.
- TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY: corresponding Cloudflare
  keys restricted to the actual host. Only the site key is public.
- SITE_ORIGIN: canonical origin (http://localhost:3000 locally, HTTPS in production).
- ALLOWED_ORIGINS: optional comma-separated additional exact origins.
- TRUSTED_PROXY_MODE: defaults to vercel; `local` is only for loopback development.
- ADMIN_WHATSAPP_NUMBER: international digits, without '+'.
- BKASH_RECIPIENT_NUMBER: canonical Bangladesh mobile number.

For local runs use the official Turnstile always-pass site key
`1x00000000000000000000AA` and secret key
`1x0000000000000000000000000000000AA`, a locally generated synthetic HMAC secret,
and synthetic numbers `8801000000000` and `01000000000`. These are not live
contacts or payment destinations. The production loader rejects those number
formats, missing settings, HTTP origins, local mode and Turnstile test keys.
`LOCAL_ORDER_SMOKE=1` is an explicit local production-build test opt-in; it requires
loopback database/origins and local mode. The committed start command only binds
127.0.0.1. Never set this switch on Vercel. It does not bypass captcha verification.
Vercel deployments must use real keys and valid configured contact/payment data.

## Security and operational assumptions

- Vercel is the ingress boundary. It must overwrite `x-forwarded-for` with the
  verified client address. Only that single-IP header is read in vercel mode;
  malformed/multi-IP values fail closed. `x-real-ip` and Cloudflare headers are
  ignored. Direct origin access behind another proxy is unsupported. Confirm
  the header contract on the actual Vercel deployment before enabling payments.
- PostgreSQL rate events use a transaction-scoped per-IP advisory lock, shared
  by every serverless instance: 5 attempts/10 minutes and 20/day, sliding windows.
  CAPTCHA/field failures consume attempts. Each request deletes that identity's
  expired events. Schedule a privileged maintenance job to remove all events
  older than one day so dormant IP entries do not grow indefinitely. This is
  a narrow IP control, not protection against a distributed botnet; add platform
  WAF/request limits before launch. HMAC hashes are still pseudonymous data;
  define order/audit retention and privacy policy before collecting real data.
- TrxID assumption: uppercase alphanumeric 8–12 characters after whitespace
  removal. Confirm with real bKash records. The database enforces normalized
  storage and uniqueness; this cannot detect a fabricated but unused TrxID.
- Product price and activity are locked/read inside the insert transaction.
  Unknown client fields (including amount/status) are rejected. Order + audit
  creation is atomic. Code collisions retry up to five generated candidates.
- POST checks exact origin/referer, JSON type and actual 10 KB stream size, then
  rate limit, Turnstile, strict schema, active DB product and transactional insert.
  Turnstile checks hostname and action `order` with a five-second timeout. Only
  Cloudflare's official verification endpoint is used, including local tests.
- No user-supplied data is interpolated into SQL. All DML uses bound parameters.
  Generic errors omit SQL, table names, PII and stack traces. Invalid field errors
  include names and static messages only. No request-body logging is performed.
- Nonce CSP requires dynamic rendering for all pages. It allows only same-origin
  assets and Cloudflare Turnstile script/frame/connect destinations. Headers also
  set frame denial, nosniff, strict-origin-when-cross-origin and production HSTS.
- Checkout reads active products/prices from PostgreSQL and sends no price. The
  existing inactive mock checkout remains a clearly labelled non-submitting demo.
  Product catalog cards remain mock examples; review/replace them and draft policy
  pages before enabling real offers. No browser storage is used for customer data.
- The current requested flow accepts a TrxID with order creation: it does not
  reserve a quote/order code before payment. The price is re-read at submission.
  A stable pre-payment quote/reservation flow and explicit business policy are
  needed before real payments, especially if prices can change during payment.

Actual checks and remaining verification are recorded in
[phase-4-verification.md](phase-4-verification.md).

Next implementation task: Phase 5, an IDOR-resistant order tracking page with an
explicit customer-access design. An order code alone must not grant access to PII.
