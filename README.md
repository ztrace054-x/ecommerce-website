# AI Service E-commerce — Bangladesh

Continuation of `ztrace054-x/ecommerce-website`, retaining the existing Next.js
App Router application, Bangla customer pages, plain CSS and local licensed font.
The original Phase 0/1 foundation was audited at
`b2b490f25b12d66cc1b341c2455747a952cf0338`. The unmerged Phase 2 work at
`8170a19cedfde1d0a169127c558cb4e05aabdf4b` is retained, including its original
tables, migrations, money format, encryption and terminal tools. The marketplace
extends that work with migration `0002_marketplace`; it has not been rebuilt.

## Current progress

Customer catalog, database quotes, validated payment claims, private tracking,
admin authentication, order verification/rejection/delivery, internal notes,
product management and audit history are implemented. PostgreSQL constraints
and restricted transactional RPCs protect the business rules. Supabase Auth
handles web admin passwords and requires enrolled authenticator MFA; there is
no default password or public signup. The original terminal-created identities
remain inactive until linked to a provisioned provider user.

**Real checkout is closed.** The owner has not supplied Supabase/Turnstile
configuration, bKash recipient/method, finalized policies or approved actual
prices. The original four samples remain labelled when no database is configured.
No real payment, customer database, subscription inventory or voucher sale has
been connected. This is a tested implementation/review candidate, not a claim
that a commercial system has been activated.

[Repository audit](docs/repository-audit.md) ·
[Architecture](docs/architecture-continuation.md) ·
[Activation guide](docs/deployment.md) ·
[Security](docs/security.md) ·
[Verification](docs/continuation-verification.md)

Published private review: https://ai-seba-marketplace.cwrtravel1102.chatgpt.site
The hosting operation returned `succeeded` on 13 October. The review requires
the owner's ChatGPT sign-in and keeps real payment collection closed.

Review PR: https://github.com/ztrace054-x/ecommerce-website/pull/1
All 69 tests and both builds also passed in native PostgreSQL GitHub CI. The
workflow remains blocked only at the full dependency audit described below.

## Run locally

Use Node.js 24 LTS and npm. Install the committed lockfile:

```bash
npm ci
npm run dev
```

Open http://localhost:3000. No credentials are needed for the closed preview.
Use synthetic details in the preview form. No preview form data is stored or sent.
Stop the server with Ctrl+C. For the real backend, follow the activation guide
and put credentials only in an ignored local environment file or host secret
store; never fill the committed `.env.example`.

```bash
npm run check
npm run audit:dependencies
```

The checks validate environment safety, lint, strict types and security/business
integration tests, then build both Next.js and the Sites Worker adapter.
`npm run build:next` builds only standard Next.js; `npm start` serves it on
loopback. `npm run build:site` builds the Worker from the same application.
Installation/builds do not configure Supabase or take real payments.

## Routes

| Page                                                | Purpose                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/`, `/products`, `/products/[slug]`                | Home, catalog and service details                                              |
| `/checkout?product=<slug>`                          | Database-backed quote and claim flow when configured; closed preview otherwise |
| `/track-order`                                      | Code + email + private access key; no customer password                        |
| `/admin/login`, `/admin`                            | Protected administration; every data API authorizes access independently       |
| `/faq`, `/contact`, `/privacy`, `/terms`, `/refund` | Help, configurable support and policy drafts                                   |

| API                                              | Methods / behavior                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `/api/products`                                  | GET active catalog; explicitly labelled samples only when unconfigured   |
| `/api/orders/quote`                              | POST product ID; quote price and recipient come from the server/database |
| `/api/orders`                                    | POST validated customer/payment claim; TrxID has DB-level uniqueness     |
| `/api/orders/validate-transaction`               | POST syntax check only; never confirms payment or exposes other claims   |
| `/api/orders/track`                              | POST private verification; no secrets in query strings                   |
| `/api/admin/auth/login`, `/logout`, `/session`   | Provider authentication and revocable HttpOnly sessions                  |
| `/api/admin/overview`, `/orders`, `/orders/[id]` | GET summary/list/detail; PATCH constrained status with version check     |
| `/api/admin/orders/[id]/notes`                   | POST internal note, never returned by customer tracking                  |
| `/api/admin/products`, `/products/[id]`          | GET/POST/PATCH catalog management; disable rather than delete history    |
| `/api/admin/audit`                               | GET paginated admin action history                                       |

Request/response examples and error behavior are in [API documentation](docs/api.md).

## Where files belong

| Path                               | Responsibility                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/app`, `src/components`        | Existing customer UI plus checkout/tracking/admin                                        |
| `src/app/api`                      | Small route handlers with validation and authorization                                   |
| `src/db`                           | Retained Drizzle schema/history, additive RPC migration and restricted HTTP adapter |
| `src/lib/auth`, `src/lib/security` | Provider/session checks, origin and body limits, rate limiting and Turnstile             |
| `src/data/mock-products.ts`        | Original samples only; never authoritative order prices                                  |
| `tests`                            | Configuration, validation, PostgreSQL and route integration tests with synthetic data    |
| `build`, `vite.config.ts`          | Sites hosting adapter; standard Next.js scripts remain available                         |
| `.openai/hosting.json`             | Review Site identity, never credentials                                                  |

The web claim flow is `submitted → verified → delivered`, or `submitted → rejected`.
Original Phase 2 `pending` rows and their timestamps remain intact; web quotes
use separate checkout sessions and do not create new pending orders.
`refunded` is reserved pending an approved refund procedure. A display code is
not a password. The access key is shown at checkout and must be kept privately.
A TrxID or WhatsApp conversation never proves a payment happened.

## Before commercial launch

Follow [deployment.md](docs/deployment.md), including staging database/browser and
real-provider checks, confirmed business/payment details, backups, retention and
approved policies. Review the official October 14 Next.js/upstream security
update and patch affected dependencies before enabling checkout. A clean package
audit does not establish that unreleased vulnerabilities are absent.

The standard Next.js runtime dependency audit has zero known advisories. The
hosting build chain has an unresolved `braces` advisory; the full dependency
audit remains blocking and is not suppressed. See current verification for scope.

Historical foundation/customer checks are retained in `docs/phase-0-verification.md`
and `docs/phase-1-verification.md`. Current evidence and limits are recorded
separately; historical screenshots do not count as QA of the new flows.
