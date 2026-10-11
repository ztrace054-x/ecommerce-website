# AI services e-commerce project

A Bangladesh-focused project for ordering permitted AI products and services,
paying through bKash, and receiving delivery after an administrator manually
checks the payment. [PLAN.md](PLAN.md) is the project source of truth.

## Current stage: Phase 0

The repository contains a working Next.js App Router and TypeScript foundation.
The home route is a development placeholder. It is not a customer storefront.
Database, authentication, payment, delivery, and email integrations are not
implemented or connected. There are no real credentials or customer records.

Work stops here until the owner approves Phase 1. Nothing has been deployed.

## Run locally

Install **Node.js 24 LTS**, npm, and Git. In the repository folder:

```bash
git switch phase-0
npm ci
npm run dev
```

Open <http://localhost:3000>. `npm ci` uses the committed lockfile so everyone
gets the same package versions. `npm run dev` starts a local development server;
it does not publish the website. The server binds to the local computer only.

No `.env` file or service account is needed for Phase 0. `.env.example` contains
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
| `src/app/` | Next.js layouts, pages, and their styles. |
| `src/app/api/` | Reserved for future server route handlers; no endpoints yet. |
| `src/components/` | Reserved for reusable interface components. |
| `src/db/` | Database schema and migrations will be added after approval. |
| `src/lib/env/` | Explicit separation of public configuration and server secrets. |
| `src/lib/auth/` | Authentication requirements; no login or bypass code. |
| `src/lib/security/` | Security requirements for later input and bot checks. |
| `scripts/` | Checks for safe environment configuration in Git. |
| `docs/` | Architecture, local development, and security notes. |
| `tests/` | Repeatable configuration/security tests; business tests arrive with their features. |
| `.github/workflows/` | GitHub checks for installation, environment safety, types, lint, build, and dependencies. |

Folders reserved for later phases contain explanatory README files. Those files
keep the folders in Git without adding unused application code.

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

## Budget and hosting

Phase 0 runs locally without paid services. Future Supabase and Resend usage must
stay within their permitted free-tier limits. No billing accounts are connected.

Vercel compatibility is a technical requirement, not a promise of free business
hosting. [Vercel's Hobby plan](https://vercel.com/docs/plans/hobby) currently limits
usage to personal, non-commercial projects. Agree on an eligible hosting option
before a future commercial launch. Do not deploy this foundation.
