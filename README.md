# AI services e-commerce project

## Current review: Phase 8 security hardening

The owner merged Phase 7 (PR #6). Phase 8 fixes delivery races, admin abuse limits,
JSON ambiguity and privacy issues, and adds an automated attack suite. See the
[security review and evidence](docs/phase-8-security.md) and
[owner protection checklist](docs/github-protection-checklist.md). This remains a
private synthetic project; no deployment or automatic merge is authorized.
Earlier phase notes below are historical.

## Current branch: Phase 7 delivery

PR #4 (Phase 6 admin) was merged by the owner. This branch adds encrypted voucher
inventory, audited assignment/reveal/void operations, delivery email and WhatsApp
handoff, plus tracking destination masking. See [Phase 7 setup and verification](docs/phase-7-delivery.md).
The Phase 7 branch is for review; do not merge or deploy it automatically.

A Bangladesh-focused project for ordering permitted AI products and services,
paying through bKash, and receiving delivery after an administrator manually
checks the payment. [PLAN.md](PLAN.md) is the project source of truth.
Its [working rules](PLAN.md#working-rules-for-every-phase) apply to every phase;
its [Progress section](PLAN.md#progress) records done, next, and known issues.

## Branch update: Phase 6 administration

Phase 5 is merged. This branch adds the private admin panel with password plus
TOTP/recovery authentication and manual order review. See [Phase 6 operation and
verification](docs/phase-6-admin.md) before configuration or use. This is a review
branch, not a deployment. No public sign-up, email or automatic delivery is added.

## Branch update: Phase 5 tracking

Phase 4 is merged. `feat/phase-5-order-track` adds customer tracking by order code
and the sending bKash number's last four digits. See [Phase 5 setup and evidence](docs/phase-5-order-tracking.md)
for migration, limits, verification and remaining manual checks. No new environment
variables or dependencies are required. This branch is for review, not deployment.

## Branch update: Phase 4 order API

The owner explicitly authorized the customer-side order API on
`feat/phase-4-order-api`. This branch adds local PostgreSQL migrations, submitted
payment claims, database rate limits, Turnstile verification, and checkout wiring.
It does not add administrator transitions, tracking, delivery, or email. A
submitted claim is not a verified payment. No production database is connected,
and no branch has been pushed or merged as part of this work.

Use [Phase 4 setup](docs/phase-4-order-api.md) for this branch's required local
database and configuration; the Phase 1 commands and descriptions below record
the earlier frontend-only foundation. See [verification](docs/phase-4-verification.md)
for actual results and remaining live checks. Production contacts, origin,
credentials, and deployment assumptions still require configuration and review.

## Current stage: Phase 1 — customer frontend

Phase 0 is approved and merged into `main`. The `phase-1` branch adds the Bangla
customer interface: Home, service list, Product/Plan, Checkout preview, Refund,
Privacy, Terms, Contact, FAQ, and a floating WhatsApp icon. The roadmap has been
corrected: database work is Phase 2, as requested by the owner.
The mobile-first design uses plain CSS and a locally served, licensed Bangla
font. It does not request fonts from Google or add a UI framework.

All four sample services and prices come from `src/data/mock-products.ts`.
Prices are visibly labelled as samples. The checkout has local demo feedback
only: it creates no orders, submits no personal information, takes no payments,
and does not store input. Only synthetic details should be used in the preview.

The policy pages are drafts, without invented refund promises. No WhatsApp
number or support email has been supplied, so the floating icon opens the
Contact page. Real `wa.me` order links belong to Phase 6.

Database, authentication, payment, delivery, and email integrations remain
unimplemented and unconnected. No real credentials or customer records exist.
Nothing has been deployed. Phase 2 needs the owner's approval.

## Run locally

Install **Node.js 24 LTS**, npm, and Git. In the repository folder:

```bash
git switch phase-1
npm ci
npm run dev
```

Open <http://localhost:3000>. `npm ci` uses the committed lockfile so everyone
gets the same package versions. `npm run dev` starts a local development server;
it does not publish the website. The server binds to the local computer only.

No `.env` file or service account is needed for Phase 1. `.env.example` contains
empty placeholders for future work. Keep them empty at this stage.

To check the foundation and start a production build locally:

```bash
npm run check
npm run audit:dependencies
npm start
```

Stop a running server with **Ctrl+C**. Stop the development server before
starting the production server, because both use port 3000 by default.

## Where files belong

| Path | Purpose |
| --- | --- |
| `src/app/` | Bangla customer routes, shared layout, and mobile-first plain CSS. |
| `src/app/api/` | Reserved for future server route handlers; no endpoints yet. |
| `src/components/` | Shared header, footer, cards, policy layout, icons, and local checkout preview. |
| `src/data/mock-products.ts` | The only source of mock products and prices; presentation only. |
| `public/fonts/` | Self-hosted Bangla font, license, and source attribution. |
| `src/db/` | Database schema and migrations are reserved for Phase 2. |
| `src/lib/env/` | Explicit separation of public configuration and server secrets. |
| `src/lib/auth/` | Authentication requirements; no login or bypass code. |
| `src/lib/security/` | Security requirements for later input and bot checks. |
| `scripts/` | Checks for safe environment configuration in Git. |
| `docs/` | Architecture, local development, and security notes. |
| `tests/` | Repeatable configuration/security tests; business tests arrive with their features. |
| `.github/workflows/` | GitHub checks for installation, environment safety, types, lint, build, and dependencies. |

Folders reserved for later phases contain explanatory README files. They keep
the intended boundaries visible without unused database/authentication code.

## Customer routes

| Route | What to try |
| --- | --- |
| `/` | Home and sample service cards. |
| `/products` | All four sample plans. |
| `/products/ai-setup` | Example details; each known slug has its own page. |
| `/checkout?product=ai-setup` | Sample checkout; a query-supplied price is ignored. |
| `/checkout` | Guidance to choose a plan first. |
| `/refund`, `/privacy`, `/terms` | Draft policy pages. |
| `/contact` | Contact information is not configured yet. |
| `/faq` | Keyboard-accessible questions using native expandable sections. |

Unknown products display a Bangla not-found page. There is no cart, login,
tracking page, payment endpoint, or API-backed order submission in Phase 1.

## Safety rules

- Never collect passwords for customers' third-party AI accounts.
- Never sell pre-made accounts, shared logins, or stolen accounts.
- Use only official, permitted invites/gifts, authorized vouchers, and services.
- Keep secrets on the server. Never add them to `NEXT_PUBLIC_*` configuration.
- Prices must come from the database when order handling is implemented.
- A TrxID submission or WhatsApp message never proves payment by itself.
- Never treat the example `ADMIN_SECRET` variable as a login password or API key.

Read [docs/security.md](docs/security.md) before adding integrations and
[docs/local-development.md](docs/local-development.md) for command explanations.
See [docs/architecture.md](docs/architecture.md) for the planned boundaries and
[tests/README.md](tests/README.md) for the validation strategy. Run `npm test` for
the configuration security tests; `npm run check` includes them. The evidence is
recorded in [docs/phase-0-verification.md](docs/phase-0-verification.md).
Phase 1 runtime and interaction evidence is recorded in
[docs/phase-1-verification.md](docs/phase-1-verification.md).

## Budget and hosting

Phase 1 runs locally without paid services. Future Supabase and Resend usage must
stay within their permitted free-tier limits. No billing accounts are connected.

Vercel compatibility is a technical requirement, not a promise of free business
hosting. [Vercel's Hobby plan](https://vercel.com/docs/plans/hobby) currently limits
usage to personal, non-commercial projects. Agree on an eligible hosting option
before a future commercial launch. Do not deploy this foundation.
