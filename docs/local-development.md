# Local development, step by step

Use Node.js 24 LTS, npm, Git, and Docker with Compose v2. The full terminal test
suite uses util-linux script on Linux; Windows users can use Ubuntu/WSL2.
Keep real payments/customers/vouchers out of this development project.

1. Switch to the completed source on main and run npm ci.
2. Copy .env.example to .env. Fill only POSTGRES_PASSWORD, DATABASE_URL and
   TEST_DATABASE_URL using README's private local instructions. Leave future
   service placeholders blank. Do not reuse a password from a real account.
3. Start Docker, run npm run db:start, then npm run db:migrate and npm run db:seed.
4. Run npm run dev and open http://localhost:3000. Stop with Ctrl+C.

## Commands explained

| Command | What it does |
| --- | --- |
| npm ci | Installs the exact lockfile. |
| npm run db:start | Starts local PostgreSQL 17 via Compose and waits for health. |
| npm run db:stop | Stops PostgreSQL, preserving its volume. |
| npm run db:migrate | Applies committed migrations using a private URL. |
| npm run db:seed | Inserts four missing demo products, without overwriting edits. |
| npm run admin:create | Interactive identity creation with hidden password/confirmation; no login/session. |
| npm run db:generate | Generates schema migrations for review; does not connect a live database. |
| npm run db:check | Checks migration history consistency. |
| npm run check | Environment safeguards, lint, types, all tests and production build. |
| npm run test:unit | Configuration/validation/crypto/code tests without a database. |
| npm run test:db | Tests and cleans fixtures in the explicitly disposable local _test database. |
| npm run audit:dependencies | Fails on moderate-or-higher advisories, including development dependencies. |
| npm run smoke:dev | Starts/stops dev on port 3000 and checks DB-backed pages; stop your other server first. |
| npm run build / npm start | Local production build/server; no deployment. |

## What to check by hand

- Home and /products show two seeded service examples and BDT 500/750.
- Open a product and checkout through the links. Enter synthetic contact details;
  local feedback works but no order/payment/request/storage is created.
- Add &price=1 to the checkout URL: displayed DB price must remain unchanged.
- Inactive A/B UUIDs and invalid/repeated selectors must not show checkout fields.
- Try the FAQ by keyboard, mobile widths, policies and Contact. WhatsApp still
  opens Contact because no number has been supplied.
- Rerun db:migrate and db:seed; neither should duplicate records or reset edits.
- Optionally run admin:create in a real terminal; passwords must stay hidden.
  There is no admin login yet. Never enter a customer's account password.
- Stop/restart the database; its product data should persist in the local volume.

## Common problems

Missing Docker: install/launch Docker with Compose v2 on your computer; no Supabase
account is required. Port 5432 is occupied: stop the other local PostgreSQL service
or choose a different local Compose port and update both private URLs consistently.
Port 3000 is occupied: stop the existing Next.js server before smoke/dev/start.

Cannot load products: check Docker health, private URL spelling/encoded password,
then migrations and seed. Error pages deliberately do not print connection details
or fall back to mocks. DATABASE_URL is not a public environment variable.

Missing ecommerce_test after reusing an older volume: Docker init scripts run
only for fresh volumes. Create the separate disposable DB explicitly:

```bash
docker compose exec db createdb -U ecommerce ecommerce_test
```

Do not delete a data volume to fix an ordinary configuration error. Changing
POSTGRES_PASSWORD does not change an existing volume's database password; retain
its matching local password or deliberately reset only disposable data after review.

Tests refuse to run: TEST_DATABASE_URL must be a separate loopback _test database.
Tests delete their table fixtures. Never bypass this guard or use a live URL.
For terminal tests, ensure Linux's script utility is installed (util-linux).

Remote TLS error: provide the correct trusted CA for the authorized future database;
never disable server certificate verification. No remote service is required now.

All root environment files stay private. Node scripts read .env; use that file for
the shared local setup. No real encryption key is needed for catalog/seed/admin
identity creation; automated encryption tests use explicitly public fixtures.
