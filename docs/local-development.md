# Local development for a beginner

## Prerequisites

Install Node.js 24 LTS, which includes npm, and install Git. The `.nvmrc` file
also requests Node 24 if you use a Node version manager. Check your installation:

```bash
node --version
npm --version
git --version
```

## Open the branch

If you already have a clone, open its folder and run:

```bash
git fetch origin
git switch phase-0
npm ci
npm run dev
```

If you need a new clone, authenticate to GitHub through your normal Git/GitHub
Desktop setup. Do not put a personal access token into a URL or commit it:

```bash
git clone https://github.com/ztrace054-x/ecommerce-website.git
cd ecommerce-website
git switch phase-0
npm ci
npm run dev
```

Open <http://localhost:3000>. You should see **Project foundation is ready.**
The page is a development placeholder, so it contains no products or payment
form. These commands run the application on your computer only.

## What the commands mean

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exactly the packages recorded in the lockfile. |
| `npm run dev` | Start the local development server with automatic rebuilding. |
| `npm run check:env` | Check environment templates and Git-visible environment files. |
| `npm run lint` | Catch coding mistakes and framework rule violations. |
| `npm run typecheck` | Generate route types and check strict TypeScript without emitting code. |
| `npm run build` | Produce a local production build; no deployment. |
| `npm run check` | Run the environment, lint, type, and build checks together. |
| `npm run audit:dependencies` | Ask the package registry about known dependency advisories. |
| `npm start` | Run the completed production build locally. |

`npm run audit:dependencies` needs network access to the package registry. If
the registry is unavailable, the audit is incomplete; do not report it passed.
Do not run `npm audit fix --force` without reviewing major-version changes.

## Environment files

No `.env` is required to run Phase 0. The empty `.env.example` file documents
future names; it does not contain credentials. Do not fill it with real values.

After a later phase explicitly permits local configuration, copy the template
to `.env.local` using your file manager or `cp .env.example .env.local` on
macOS/Linux. Keep private values only in ignored local files or the approved
server secret store. Never paste them into commits, chat, screenshots, or logs.

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` will be visible in a browser by design.
Database URLs, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `ADMIN_SECRET`, and
`ENCRYPTION_KEY` must stay server-only. Do not rename secrets with `NEXT_PUBLIC_`
and do not place them in the `env` option of `next.config.ts`.

## Manual Phase 0 checks

1. Open `/` and confirm the development placeholder loads.
2. Check it on a narrow mobile-sized window and a desktop-sized window.
3. Confirm `/api/orders`, `/api/payments`, and `/admin` return 404.
4. Run `npm run check` and `npm run audit:dependencies`; confirm success.
5. Use `git check-ignore .env .env.local` to confirm those paths are ignored.
6. Open `.env.example`; every configuration assignment should be empty.
7. Stop the development server with Ctrl+C; run `npm start` after a successful
   build and repeat the placeholder check. Stop it again when finished.

Approve Phase 1 only after reviewing the foundation. Phase 1 begins with the
schema-blocking questions in PLAN.md, not with real customer data or services.
