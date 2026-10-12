# Application boundaries

Next.js App Router serves the existing mobile-first Bangla pages. Product pages
render dynamically at request time and load active products through server-only
catalog functions. Only ID, name, description, price and delivery type are public.
Prices are whole BDT database integers. No mock product fallback remains.

| Boundary | Location | Responsibility |
| --- | --- | --- |
| Customer interface | src/app, src/components | Render public products and the local checkout preview. |
| Presentation | src/lib/format.ts, product-presentation.ts | BDT formatting and A/B/C delivery guidance, never product prices. |
| Input validation | src/server/validators.ts | Strict Zod contracts, sizes, normalization and rejection of extra fields. |
| Data access | src/server/catalog.ts, orders.ts, admin-provisioning.ts, seed.ts | Parameterized typed queries, transactions and redacted errors. |
| Database | src/db, src/server/database | Five tables, reviewed migrations, constraints/RLS, lazy verified connection. |
| Cryptography | src/server/security | Secure order codes, AES-GCM with record context, scrypt passwords. |
| Local operations | scripts, docker-compose.yml | Disposable/local DB setup, seed, terminal provisioning, checks. |

Application pages never import the query driver or schema for writes. Internal
order creation is not an HTTP endpoint or Server Action. The checkout fieldset
has no HTML form, input names, submission, logging or persistent storage.

The database trigger supplies and freezes order quotes. Canonical TrxIDs and
order codes are globally UNIQUE; assigned TrxIDs cannot be changed. RLS has no
public policies. SQL migration DDL is static; runtime data is parameterized by
Drizzle. Server exceptions do not attach driver's query/PII/credential causes.

Nothing authenticates an administrator or approves a payment yet. Phase 3 adds
the Order API, request limits and Turnstile; Phase 4 private tracking; Phase 5
login, 2FA and authenticated management/audits. Password hashing/provisioning is
complete for Phase 2, but an identity is not a session. No authentication shortcut
or always-successful bot/payment check exists. No live service is connected.
