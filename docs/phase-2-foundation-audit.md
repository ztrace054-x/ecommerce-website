# Phase 2 foundation audit and implementation plan — 14 October 2026

## Current authorization

Complete the database/backend foundation in the existing repository. Preserve
all customer pages and earlier backend work. No deployment, publishing, Vercel
connection, live database connection, new admin UI, payment gateway or email
automation is authorized in this task. Historical deployment instructions are
superseded. Existing review hosting is not changed by this work.

## Repository and frontend audit

The local checkout and GitHub `phase-3-marketplace` both start at
`247f425121d9c597b1134ec8acf42b36c193d7d7`; the working tree was clean.
`main`/`phase-1` remain at `b2b490f25b12d66cc1b341c2455747a952cf0338` and
the older `phase-2` is `8170a19cedfde1d0a169127c558cb4e05aabdf4b`.
The advanced continuation already preserves that earlier database work. Continue
the advanced branch; switching back would omit completed work. Do not merge.

Phase 1 has the Bangla homepage (hero, services, benefits, trust, FAQ and CTA),
catalog, four sample detail pages, checkout preview, privacy/refund/terms drafts,
contact and FAQ. Shared components, plain CSS and the licensed local font remain.
Samples show their status; actual policies/catalog/contact details are unapproved.
Earlier tracking/admin pages exist but are outside this task's UI scope.

| Existing path | Responsibility |
| --- | --- |
| `src/app`, `src/components` | App Router server pages and existing interactive forms/components |
| `src/data/mock-products.ts` | Clearly labelled samples, never authoritative checkout prices |
| `src/lib/catalog.ts` | Server-only catalog selection and public product DTOs |
| `src/server` | Native PostgreSQL/Drizzle data access, validation, seed and provisioning utilities |
| `src/app/api/products` | Public catalog GET; single-product GET is the missing route |
| `src/app/api/orders` | Existing quote, claim, syntax validation and private tracking handlers |
| `src/app/api/admin` | Existing provider MFA sessions, protected orders/products/audit handlers |
| `src/db` | Drizzle schema, three immutable migrations and server-only HTTP RPC adapter |
| `src/lib/security`, `src/lib/auth` | Origin/body limits, rate limits, bot checks and admin sessions |

## Current data flow

Server pages call the server-only catalog. With no database settings it returns
labelled samples; with `DATABASE_URL` it uses the retained Drizzle catalog; with
Supabase settings it uses restricted HTTP RPCs. A configured provider failure
does not silently turn into mock success. Browser code never accesses the database.

Existing web writes run through route validation/origin/body limits, server-only
RPC calls, and transactional PostgreSQL functions. A quote loads the product's
database price. A claim locks that quote and creates one submitted order. TrxID
uniqueness and immutable snapshots are database-enforced. Private tracking
requires code, email and a secret key. Admin actions require the provider plus
an active local identity/session, then atomically write status, notes and audit.
Checkout remains closed with the current blank configuration.

## Requirement audit and decisions

| Requirement | Existing foundation | Targeted continuation |
| --- | --- | --- |
| Products | UUID, name, description, unique optional storefront slug, JSON category, integer BDT, delivery type, active flag, timestamps | Explicit BDT-only currency and a generated category column; retain old fields and UUID fallback slugs |
| Orders | Unique code, product FK, contacts, immutable database price, status/timestamps | Explicit BDT currency and generated payment status independent of fulfillment display |
| Payment Claims | One claim per order, unique immutable canonical TrxID, sender, submission timestamp; admin verification in audit | A private, typed `payment_claims` view joins existing claim and review records without duplicating mutable payment truth |
| Admin users/roles | Inactive-by-default identities, provider ID, MFA, lock/session checks | Explicit admin/support roles; support is reserved and receives no current admin permissions |
| Audit logs | Admin/order FKs, append-only runtime writes, transactional events | Reuse them for payment review attribution; never invent missing historical reviewers |
| API separation | Thin handlers, validation, server adapters, PostgreSQL transactions | Add single-product GET using the existing server catalog and generic errors |
| Testing/docs | Unit, PGlite, native PostgreSQL/CLI, CI and HTTP smoke suites | Test new migration against populated data, generated fields, role denial, view RLS/grants, lookup privacy and outages; correct stale docs |

The payment-claim view is deliberately **not a second writable table**. The
current model accepts exactly one immutable claim per order. A separate store
would require synchronizing two authorities and rewriting existing submission
logic. The view provides the requested structure while preserving database
uniqueness on `orders.trx_id`. Multiple attempts/corrections need a later reviewed
policy and migration. A missing historical verification audit remains NULL.

Existing `price_bdt` and `amount_expected` stay integer **whole BDT**; HTTP quotes
use integer poisha with exact multiplication by 100. No historical amount is
rescaled. A generated payment status maps pending→unpaid, delivered→verified,
and otherwise the matching claim status. Clients cannot write it independently.

Use the project's existing Drizzle migration journal, not a second Supabase CLI
migration history. Supabase compatibility here concerns PostgreSQL, explicit
grants/RLS and server-only access; no hosted provider is connected or migrated.
Views use PostgreSQL 15+ `security_invoker` and explicit grants so they do not
bypass the underlying tables' row security.

## Implementation sequence

1. Add Drizzle fields/view and generate one additive migration. Review generated
   SQL, extend role checks in existing RPCs and apply explicit view grants.
2. Add the missing product route through the existing service boundary.
3. Test fresh/populated migration paths, invariants and HTTP behavior; run lint,
   types, existing tests, build and development/production smoke checks.
4. Update Progress / Done / Next / Known issues, commit/push the continuation
   branch, inspect CI, and report actual evidence without deployment.

## Progress

### Done

- Completed current-branch, frontend/data flow, schema/API and security audit.
- Confirmed this is additive continuation, with publishing paused.
- Generated/reviewed `0003_phase_2_foundation.sql` and its Drizzle snapshot.
  Original migrations, order codes, TrxIDs, amounts and frontend source remain.
- Added BDT-only product/order currency, generated category/payment status,
  private claim view, explicit admin/support role and guards for existing sessions
  and privileged operations. Support remains reserved with no permissions.
- Added GET `/api/products/[slug]`, using the existing public catalog, slug
  validation and generic no-store JSON responses. Inactive/unknown selectors
  share a 404; configured outages fail closed; samples stay labelled/inactive.
- Added seven database foundation tests and three product API tests; extended
  native database and production smoke checks. Test migrations now follow the
  complete journal instead of a hard-coded three-file list.
- Updated the plan, repository instructions, architecture, database, API,
  security, test and deployment documentation to reflect current scope.

### Verification

| Check | Current local result |
| --- | --- |
| Environment guard, lint, strict TypeScript | Passed via `npm run check` |
| Drizzle journal/snapshots | `npm run db:check` passed |
| Unit/configuration tests | 29 passed |
| Marketplace/API/foundation tests | 35 passed, including 10 new tests |
| Standard Next.js and retained Worker build | Both passed via `npm run build` |
| Production HTTP smoke | 19 pages, 13 static assets, local font, headers, four product GETs/POST rejection, unknown-product 404, protected APIs and closed checkout passed |
| Development HTTP smoke | Default port 3000, four sample plans, invalid selectors, policies/tracking/admin routes and closed checkout passed; server stopped |
| Runtime dependency audit | Zero known vulnerabilities reported |
| Full dependency audit | Existing braces advisory still fails: six high affected package entries, one underlying advisory; not suppressed |
| Native PostgreSQL/terminal suite | 15 existing tests extended; runs in GitHub CI after push, not claimed as locally executed |

PGlite tests execute the actual PostgreSQL migration SQL and query the generated
schema through Drizzle. They cover fresh schemas and populated upgrades across
all six retained statuses; stored legacy fields compare equal before/after.
The native node-postgres suite exercises the real Drizzle migrator twice and
concurrent duplicate submissions. PGlite's prepared migrator cannot execute the
older multi-statement RPC chunk; local tests use its SQL exec interface rather
than changing immutable migration history or claiming native concurrency proof.

### Created files

- `docs/phase-2-foundation-audit.md` — audit, architecture decisions, plan/evidence.
- `src/db/migrations/0003_phase_2_foundation.sql` — additive reviewed migration.
- `src/db/migrations/meta/0003_snapshot.json` — generated Drizzle schema snapshot.
- `src/app/api/products/[slug]/route.ts` — missing single-product endpoint.
- `tests/foundation-database.test.ts` — upgrade, integrity and access regressions.

Changed existing files include the Drizzle schema/journal, server catalog and
validation, test helper/API/native tests, production smoke and documentation.
No dependency version, customer UI, CSS, original migration or hosting setting
was changed. Source commits and CI are the only remote writes in this phase.

### Next

- Review an explicitly authorized staging PostgreSQL/Supabase environment,
  provider MFA/session revocation, independent-connection concurrency and
  browser/customer/admin flows before handling real customer data.
- Finalize actual products/prices, business contacts, policies, bKash receipt
  procedure, claim corrections/refunds, retention and backup/recovery practices.
- Resolve the existing build dependency advisory and complete security review.
- Implement scoped support permissions only if requested. No payment gateway,
  email automation, new admin UI, deployment or Vercel connection in this phase.

### Known issues

- The payment-claim structure is a read-only view, not a new independent claim
  store. It deliberately supports the current one-claim-per-order model only.
- Historical verified/rejected orders without a matching audit cannot be assigned
  a reviewer retroactively. Their NULL review fields are preserved honestly.
- Full dependency audit fails on build-chain `GHSA-vfj7-8cjw-p6xm` in braces;
  it must be resolved before release. No forced downgrade/audit suppression.
- Native PostgreSQL/Docker is unavailable in this local container. Existing
  GitHub CI can run the native database/terminal suite; PGlite checks run locally.
- Real Supabase/MFA, concurrency, browser QA, credentials/business approvals,
  security review and deployment remain future work.

## Reference decisions

Reviewed the current Supabase changelog and official RLS/grants guidance. The
Data API exposure change reinforces using explicit grants/revocations, already
retained here. No provider account/settings were changed. Drizzle migration
generation and PostgreSQL generated columns/views were checked against official
documentation; use the project's installed 0.45/0.31 APIs and journal format.

- https://supabase.com/changelog
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://orm.drizzle.team/docs/migrations
- https://orm.drizzle.team/docs/views
- https://orm.drizzle.team/docs/generated-columns
- https://www.postgresql.org/docs/17/ddl-constraints.html
