# Repository audit — 13 October 2026

Audited `main` at `b2b490f25b12d66cc1b341c2455747a952cf0338`, fetched through
the connected GitHub plugin. This report describes the repository **before**
the continuation work on main. There are 53 files on that baseline.

Branch reconciliation also reviewed the 88-file unmerged `phase-2` tree at
`8170a19cedfde1d0a169127c558cb4e05aabdf4b`, five commits ahead of main. It already
implements PostgreSQL/Drizzle tables, immutable price/TrxID guards, encryption,
secure terminal admin provisioning, migrations/seeds and 44 historical tests.
That work is preserved. The new `0002_marketplace` migration adds web operations
to those tables rather than introducing duplicate product/order/admin tables.
Current verified progress is in `continuation-verification.md`.

## Progress and structure

The foundation and Phase 1 customer interface are complete. This is a frontend
preview, not a functioning marketplace. `src/app` contains Home, Products,
four product detail instances, Checkout, Contact, FAQ, Privacy, Refund and Terms.
`src/components` contains the shared interface and local checkout preview.
`src/data/mock-products.ts` is the single sample catalog. `src/db`,
`src/app/api`, `src/lib/auth` and `src/lib/security` contain planning README files.

| Requirement | Evidence | Audit result |
| --- | --- | --- |
| Mobile Bangla storefront | `src/app/globals.css`, bundled licensed font | Implemented |
| Service descriptions and prices | `src/data/mock-products.ts` | Sample data only; no approved live offers |
| Checkout | `src/components/checkout-preview.tsx` | Local validity feedback; no submission, TrxID, order or payment |
| Products API | No `route.ts` files | Missing |
| Orders / claims / tracking API | No `route.ts` files | Missing |
| Database schema / migrations | `src/db/README.md` | Missing |
| Admin login and dashboard | `src/lib/auth/README.md`; no admin routes | Missing |
| Audit history | Planning documents only | Missing |
| Contact and payment configuration | Contact page and blank environment template | Not supplied |
| Policies | Existing policy pages | Drafts; require business review |
| Hosting | No hosting manifest or deployed URL | Not configured |

## Security findings

The baseline has strict types, safe environment separation, blank credential
placeholders, ignored private files, escaped React text, locked dependencies,
read-only CI and basic security headers. These are useful safeguards.
They do not implement protected application behavior. Server validation,
database constraints, authorization, secure sessions, CSRF/origin checks,
durable atomic rate limiting and verified Turnstile tokens are absent.
No live payment/security bypass was found because these operations do not exist.
The display price must be replaced with a database quote before any payment.
An order code must never be the only credential for viewing private information.

The existing plan's October security notice was reverified from the official
Next.js blog: an upstream security update is announced for 14 October 2026.
Affected versions and patch instructions are not yet published. Review the
advisory and patch before commercial launch; do not claim that a clean audit
establishes immunity. Source:
https://nextjs.org/blog/upcoming-nextjs-security-update-october-2026

## Database requirements and design decisions

Retain PostgreSQL and Drizzle schema definitions. Use restricted Supabase
PostgREST/RPC calls on the server so the runtime does not require raw TCP.
Use managed Supabase Auth for administrator passwords and bcrypt hashing;
never convert `ADMIN_SECRET` into a login shortcut.

Add Products, Checkout sessions, Orders, Admins, Admin sessions, Audit logs,
internal Order notes and durable Rate limits. A checkout session holds a
database price snapshot and display code before payment, without storing PII.
Only a valid TrxID claim creates an order with `submitted` status. This avoids
new unpaid web order rows. Original Phase 2 pending records remain intact.
Keep storage money in whole BDT and convert HTTP DTOs to integer poisha,
enforce canonical TrxID uniqueness in PostgreSQL, and lock related writes.
Customer tracking requires order code, email and a random 256-bit access key.
No customer password, third-party password, PIN or OTP is collected.

## Implementation roadmap

1. Preserve Phase 2 schema/history/seeds; add reviewed web RPC migration and tests.
2. Product reads, server quotes, validated claims and private tracking. Add
   request-size limits, origin checks, Turnstile and atomic rate limits.
3. Admin authentication, per-handler authorization, overview, searchable orders,
   details, verified/rejected/delivered transitions, notes and audit history.
4. Product management and accessible checkout/tracking/error/loading states.
5. Verify data privacy, price manipulation, concurrent duplicate claims,
   unauthorized access, CSRF, replay, state transitions and transaction rollback.
6. Update README/PLAN/security/deployment instructions and push a continuation
   branch. Publish a private review of the same app; real orders remain closed
   until credentials, bKash details, approved offers and policies are configured.

## Baseline verification

`npm ci`, `npm run check:env`, lint, generated route types and strict typecheck,
all eleven existing tests, and `next build` passed in this session. Existing
browser evidence is historical; no new browser review is claimed by this audit.
