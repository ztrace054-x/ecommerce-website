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
git switch phase-1
npm ci
npm run dev
```

If you need a new clone, authenticate to GitHub through your normal Git/GitHub
Desktop setup. Do not put a personal access token into a URL or commit it:

```bash
git clone https://github.com/ztrace054-x/ecommerce-website.git
cd ecommerce-website
git switch phase-1
npm ci
npm run dev
```

Open <http://localhost:3000>. You should see the Bangla Home page headed
**AI সেবা নিন, সহজভাবে।** Follow a sample plan to its details and checkout.
These commands run the application on your computer only; the mock checkout
cannot create an order or take a payment.

## What the commands mean

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exactly the packages recorded in the lockfile. |
| `npm run dev` | Start the local development server with automatic rebuilding. |
| `npm run check:env` | Check environment templates and Git-visible environment files. |
| `npm run lint` | Catch JavaScript and TypeScript coding mistakes. |
| `npm run typecheck` | Generate route types and check strict TypeScript without emitting code. |
| `npm run build` | Produce a local production build; no deployment. |
| `npm test` | Run configuration security tests with synthetic values and temporary Git fixtures. |
| `npm run check` | Run the environment, lint, type, test, and build checks together. |
| `npm run audit:dependencies` | Ask the package registry about known dependency advisories. |
| `npm start` | Run the completed production build locally. |

`npm run audit:dependencies` needs network access to the package registry. If
the registry is unavailable, the audit is incomplete; do not report it passed.
Do not run `npm audit fix --force` without reviewing major-version changes.

## Environment files

No `.env` is required to run Phase 1. The empty `.env.example` file documents
future names; it does not contain credentials. Do not fill it with real values.

After a later phase explicitly permits local configuration, copy the template
to `.env.local` using your file manager or `cp .env.example .env.local` on
macOS/Linux. Keep private values only in ignored local files or the approved
server secret store. Never paste them into commits, chat, screenshots, or logs.

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` will be visible in a browser by design.
Database URLs, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `ADMIN_SECRET`, and
`ENCRYPTION_KEY` must stay server-only. Do not rename secrets with `NEXT_PUBLIC_`
and do not place them in the `env` option of `next.config.ts`.

## Manual Phase 1 checks

1. Open Home, the service list, each product detail, and its checkout. Confirm
   sample prices match across those pages and labels say ordering is not open.
2. Check narrow mobile, tablet, and desktop widths. Confirm no horizontal
   scrolling or clipped text; use Tab to reach links, fields, and buttons.
3. In checkout, click the demo button with missing/invalid data, then fill only
   synthetic values: `Demo Student`, `demo@example.com`, and `01700000000`.
   WhatsApp is optional. Confirm local feedback appears but no order is created.
4. Watch the browser Network panel. Typed values must not enter requests or the
   URL, and no POST/payment call should occur. Reload and confirm fields reset.
   Switching to another product must also reset the preview.
5. Try `/checkout?product=ai-setup&price=1`: the displayed sample amount stays
   unchanged. Unknown product slugs must show the not-found page.
6. Open every policy page and expand FAQ questions with mouse and keyboard.
   Click the floating WhatsApp icon: it opens `/contact#whatsapp`; there is no
   invented phone number, email, or active payment destination.
7. Confirm `/api/orders`, `/api/payments`, `/api/auth/login`, and `/admin` return
   404. Run `npm run check` and `npm run audit:dependencies`; confirm success.
8. Use `git check-ignore .env .env.local` to confirm those paths are ignored.
   Every `.env.example` configuration assignment must remain empty.
9. Stop the development server with Ctrl+C; run `npm start` after a successful
   build and repeat the route/navigation checks. Stop it again when finished.

Phase 2 is database schema, migrations, and seed data. Wait for its approval;
do not connect real customer data, service credentials, or payment systems.
