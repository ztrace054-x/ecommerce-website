# Local development

Install Node.js 24 LTS, npm and Git. Check out the continuation branch and run
`npm ci`, then `npm run dev`. Open http://localhost:3000. The existing Next.js
application runs on loopback and never publishes itself. Ctrl+C stops it.
No .env or service account is required for the closed review/sample catalog.
The preview accepts only synthetic local form input and stores/sends nothing.

The Phase 2 Compose/Node workflow is retained: start a disposable database with
`npm run db:start`, configure its private `DATABASE_URL`, then run
`npm run db:migrate` and `npm run db:seed`. Without Supabase configuration the
storefront uses that local catalog, visibly as sample data; web payment/admin
operations still remain closed. Use a separate loopback database ending in
`_test` for `TEST_DATABASE_URL` before `npm run test:db`.

Run `npm run check` for environment safety, lint, types, all tests and both builds.
`npm run build:next` then `npm start` runs a production Next.js build locally.
Stop dev first to free port 3000. `npm run build:site` produces the Worker adapter
from the same source; this is a build, not a deployment.

To use actual backend features locally, follow docs/deployment.md and configure
an isolated staging Supabase account and test Turnstile widget in an ignored
local environment file. Do not put keys into .env.example or Git. Runtime reads
are server-only and missing required configuration closes protected operations.
APP_URL must be the exact loopback origin for local writes. Use synthetic data.

The node test runner uses tests/register.mjs only to resolve TypeScript @/ imports.
`--conditions=react-server` allows the server-only marker in server tests. It does
not add an application authentication bypass. PGlite databases are temporary,
local and destroyed at test end. Test provider mocks are not part of production.

See docs/continuation-verification.md for current evidence and verification limits.
