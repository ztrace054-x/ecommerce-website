# Architecture and folder boundaries

Phase 1 adds customer pages to the approved foundation. Home, the catalog,
product details, policies, Contact, and FAQ render on the server. Product details
are generated from the known mock slugs; unknown products are rejected.
Checkout selects a known mock product and renders its summary on the server.

| Layer | Location | Boundary |
| --- | --- | --- |
| Pages/layouts | `src/app/` | Bangla presentation and navigation; no third-party customer credentials. |
| API handlers | `src/app/api/` | Future request validation and authorization on every handler. |
| Shared interface | `src/components/` | Reusable components; do not import secrets into client components. |
| Sample catalog | `src/data/mock-products.ts` | One file of temporary services/prices; no authoritative payment values. |
| Persistence | `src/db/` | Future Drizzle schema, migrations, and server-only database access. |
| Configuration | `src/lib/env/` | Explicit server/public modules; secret reads are lazy and fail when missing. |
| Identity | `src/lib/auth/` | Future reviewed sessions and server-side administrator authorization. |
| Security | `src/lib/security/` | Future validation, durable rate limiting, and Turnstile verification. |

Next.js pages are Server Components by default. Add `"use client"` only where
browser interaction requires it. The `server-only` marker protects the secret
environment module against accidental imports into a client dependency graph.
Do not pass secret environment values from a Server Component into client props.

No database client, authentication fallback, payment endpoint, encryption
function, email sender, or real service adapter exists in Phase 1. README files
in reserved folders explain the intended responsibilities.

Only the checkout preview is a Client Component. It checks native input validity
and shows local feedback. It uses a fieldset without a form, input names, or a
submit control, so even without hydration its fields cannot submit personal
information. There are no application network calls, data logs, or persistent
browser storage. A product change remounts the preview to clear sample input.

The floating WhatsApp icon opens the Contact page, where the missing contact
configuration is stated plainly. No invented destination or messaging widget
is used. Real `wa.me` links belong to Phase 6. The database is Phase 2 and the
Order API is Phase 3 under the owner's corrected roadmap.

Future writes must cross the server boundary: validate input, authenticate where
needed, authorize the specific operation, apply relevant anti-abuse checks, and
make constrained database changes in a transaction. Do not place that logic in
browser components or treat successful UI validation as server permission.

Keep one Next.js application. There is no need for microservices, queues,
webhooks, a payment gateway, or customer-account registration in this foundation.
Any architecture expansion must solve a stated requirement and receive review.
