# AI services e-commerce project

A Bangladesh-focused website for permitted AI services, official invitations,
and authorized vouchers. Future bKash payments require manual administrator
verification. [PLAN.md](PLAN.md) is the source of truth and its Progress section
records the current checkpoint. Never request customer account passwords.

## Current stage: Phase 2 — database layer

Phase 1 is approved and merged. Phase 2 is complete and merged after local and
native PostgreSQL 17 Compose CI checks. Phase 2 adds PostgreSQL, Drizzle, migrations,
validated server data access, authenticated encryption, synthetic product seeds,
interactive administrator provisioning, and database-backed customer pages.

There are five tables: products, orders, delivery codes, administrator identities,
and audit logs. Orders begin as `pending` without a TrxID. Prices use positive
whole BDT integers; a locked database price becomes an immutable order quote.
TrxIDs are canonical uppercase values with a database UNIQUE constraint. Once
assigned, they cannot be changed to free the original ID for reuse.

Home, Product/Plan, and Checkout now read active products from PostgreSQL.
Product URLs use their database UUID; old mock slugs are removed. The seed adds
four examples: two active services (C) and inactive invitation/voucher examples
(A/B). These are samples, not approved live offers. Policy pages remain drafts.

**Checkout is still UI only.** It sends/stores no customer input and creates no
orders or payment claims. No bKash recipient, Order API, admin login/session,
2FA enrollment, tracking, delivery, email, or live WhatsApp integration exists.
The provisioning script creates an identity only; it cannot grant a session.
No real secrets or services are configured. Nothing is deployed.

## Run locally

Install Node.js **24 LTS**, npm, Git, and Docker with **Compose v2**. Start Docker.
The full automated terminal tests require Linux's `script` utility (util-linux);
on Windows use Ubuntu/WSL2. GitHub CI runs the same setup on Ubuntu.

```bash
git switch main
npm ci
cp .env.example .env
```

Edit your private `.env` on your computer. Fill these three values yourself:

| Variable | Local value to supply |
| --- | --- |
| `POSTGRES_PASSWORD` | A local development password, never reused from another account. |
| `DATABASE_URL` | `postgresql://ecommerce:<URL_ENCODED_LOCAL_PASSWORD>@127.0.0.1:5432/ecommerce` |
| `TEST_DATABASE_URL` | `postgresql://ecommerce:<URL_ENCODED_LOCAL_PASSWORD>@127.0.0.1:5432/ecommerce_test` |

Replace the angle-bracket placeholder. URL-encode special password characters;
the URL password must match POSTGRES_PASSWORD. Never put values in `.env.example`,
Git, screenshots, chat, or public configuration. The other placeholders may stay
blank for the catalog. Then run:

```bash
npm run db:start
npm run db:migrate
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. `db:start` waits for PostgreSQL health; migrations
create the schema; seed inserts missing sample products without overwriting edits.
The database and Next.js server bind only to localhost. No paid service is needed.
Stop Next.js with Ctrl+C. `npm run db:stop` stops PostgreSQL while preserving data.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Server-only application PostgreSQL URL; required to load products. |
| `MIGRATION_DATABASE_URL` | Optional direct/session connection for migrations; otherwise uses DATABASE_URL. |
| `TEST_DATABASE_URL` | Separate disposable localhost database ending in `_test`; never falls back to the app database. |
| `POSTGRES_PASSWORD` | Local Compose database password; not an application login. |
| `ENCRYPTION_KEY` | Canonical base64 of exactly 32 random bytes; required for voucher/TOTP encryption, not catalog/provisioning. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Future public bot-check key, Phase 3. |
| `TURNSTILE_SECRET_KEY` | Future server bot-check secret, Phase 3. |
| `RESEND_API_KEY` | Future email integration, Phase 6. |
| `ADMIN_SECRET` | Reserved for reviewed future server use; never a shared admin password or bypass. |

Node scripts read root `.env`; Next.js also supports its normal private environment
files. Keep a single root `.env` for this local setup. All template values remain
blank. Missing database configuration produces a generic catalog error, never a
mock-data or unsafe connection fallback. Builds do not need a running database.

## Checks and administrator provisioning

Stop a running development server before the smoke check, which needs port 3000.

```bash
npm run db:check
npm run check
npm run audit:dependencies
npm run smoke:dev
```

`check` runs environment checks, lint, typecheck, all unit/database/terminal tests,
and build. **Database tests delete fixtures from the five tables in the disposable
TEST_DATABASE_URL database. Never point it at data you want to keep.** Tests do not
skip when it is missing. `npm run test:unit` runs without a database; `npm test`
runs the complete suite. CI starts a fresh PostgreSQL 17 Compose volume, runs the
same checks, migrates/seeds the app database, verifies dev pages, and removes only
its disposable CI database afterward.

Optional local administrator creation:

```bash
npm run admin:create
```

The terminal asks for email and a hidden password plus confirmation. Use 15–128
characters. Never pass passwords as arguments/environment variables. Only a salted,
memory-hard scrypt hash is stored. Duplicate email does not reset a password.
There is no seeded admin and no login yet; real 2FA is required in Phase 5.

For a local production build, use `npm run build`, then `npm start` after stopping
dev. Neither command deploys the site. See [docs/local-development.md](docs/local-development.md)
for troubleshooting and [docs/database.md](docs/database.md) for every table.

## Folder structure

| Path | Purpose |
| --- | --- |
| `src/app/` | Bangla customer pages; API folder has no endpoints yet. |
| `src/components/` | Shared interface and checkout preview; no database writes. |
| `src/db/schema.ts`, `src/db/migrations/` | Typed tables, constraints, enums, committed SQL migrations and snapshots. |
| `src/server/` | Validated data access, database connection, demo seed, admin provisioning and security utilities. |
| `src/lib/` | Environment boundary, BDT formatting, delivery-rule presentation. |
| `scripts/` | Migrations, seed, hidden terminal provisioning, environment checks and dev smoke. |
| `docker-compose.yml` | Local PostgreSQL 17 with a persistent volume and health check. |
| `tests/` | Configuration, crypto, validation, real database and terminal tests. |
| `docs/` | Beginner instructions, architecture, security and verification records. |
| `public/fonts/` | Licensed, locally served Bangla font; no external font requests. |

## Customer routes

- `/`, `/products`: active DB products.
- `/products/10000000-0000-4000-8000-000000000001`: seeded setup service.
- `/checkout?product=10000000-0000-4000-8000-000000000001`: UI preview with DB price.
- `/checkout`: choose a product first.
- `/refund`, `/privacy`, `/terms`, `/contact`, `/faq`: existing Bangla pages.

Invalid/inactive product selectors are rejected. Query prices are ignored.
The floating WhatsApp icon opens Contact until a real number is authorized.

Verification: **44 tests, lint, typecheck, build, migrations, audit and development
smoke passed**, with native PostgreSQL in CI. See
[Phase 2 evidence](docs/phase-2-verification.md) and
[passing native database checks](https://github.com/ztrace054-x/ecommerce-website/actions/runs/38215812387).

## What remains

Phase 3: protected Order API, request limits, Turnstile and TrxID submission.
Phase 4: private order tracking. Phase 5: login, 2FA, authorized state changes,
manual verification/delivery/refunds and audit writing. Phase 6: email/wa.me.
Phases 7–9: hardening, complete end-to-end tests, deployment guide and cleanup.
Wait for the owner's approval before each next phase.

Before any real use, confirm bKash method/TrxID rules, product permissions, refund
policy, contact details, runtime DB privileges, private tracking, key recovery,
retention/backups and eligible commercial hosting. RLS denies public table access;
it does not protect a leaked server database credential. See [docs/security.md](docs/security.md).
Supabase is prepared through DATABASE_URL with verified TLS, but unconnected.
Vercel compatibility does not guarantee free commercial hosting. Do not deploy.
