# Architecture and folder boundaries

Phase 0 has one active page: the local development placeholder at `/`. The only
server behavior added is the Next.js runtime and basic response headers.

| Layer | Location | Boundary |
| --- | --- | --- |
| Pages/layouts | `src/app/` | Compose the interface; no third-party customer credentials. |
| API handlers | `src/app/api/` | Future request validation and authorization on every handler. |
| Shared interface | `src/components/` | Reusable components; do not import secrets into client components. |
| Persistence | `src/db/` | Future Drizzle schema, migrations, and server-only database access. |
| Configuration | `src/lib/env/` | Explicit server/public modules; secret reads are lazy and fail when missing. |
| Identity | `src/lib/auth/` | Future reviewed sessions and server-side administrator authorization. |
| Security | `src/lib/security/` | Future validation, durable rate limiting, and Turnstile verification. |

Next.js pages are Server Components by default. Add `"use client"` only where
browser interaction requires it. The `server-only` marker protects the secret
environment module against accidental imports into a client dependency graph.
Do not pass secret environment values from a Server Component into client props.

No database client, authentication fallback, payment endpoint, encryption
function, email sender, or real service adapter exists in Phase 0. README files
in reserved folders explain the intended responsibilities.

Future writes must cross the server boundary: validate input, authenticate where
needed, authorize the specific operation, apply relevant anti-abuse checks, and
make constrained database changes in a transaction. Do not place that logic in
browser components or treat successful UI validation as server permission.

Keep one Next.js application. There is no need for microservices, queues,
webhooks, a payment gateway, or customer-account registration in this foundation.
Any architecture expansion must solve a stated requirement and receive review.
