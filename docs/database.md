# Database explained

Phase 2 uses PostgreSQL 17 and Drizzle. The database stores structured records;
Drizzle gives TypeScript code parameterized queries. Prices, IDs and customer
text are never concatenated into SQL. Reviewed static SQL migrations define the
tables, checks and triggers; application code uses `src/server/` data access.

## Products — what can be selected

| Column | Meaning |
| --- | --- |
| `id` | Internal random UUID, also used in existing product URLs. |
| `name`, `description` | Bangla display details, escaped by React. |
| `price_bdt` | Positive whole BDT integer: 500 means ৳500, not 500 poisha. |
| `delivery_type` | A = official permitted invite; B = authorized voucher; C = service. |
| `is_active` | Only true products are publicly listed/selectable; default false. |
| `created_at`, `updated_at` | Database timestamps; updates automatically refresh updated_at. |

Seed IDs are fixed for repeatability. Two C examples are active for the local
preview; A/B examples stay inactive because no platform/region/resale permission
has been confirmed. There are no actual vouchers or subscription offers.
Rerunning seed inserts missing IDs, preserving edited names/prices/active flags.

## Orders — a request and its payment claim

| Column | Meaning |
| --- | --- |
| `id`, `order_code` | Internal UUID and unique display code, e.g. ORD-2345ABCD. |
| `product_id` | Foreign key to the product. Referenced products cannot be deleted. |
| `customer_name`, `customer_email` | Minimum customer identity/contact, with email trim/lowercase. |
| `whatsapp` | Optional canonical international number; empty input becomes null. |
| `sender_bkash_number` | Bangladesh sender number: 11 ASCII digits beginning 013–019. |
| `trx_id` | Nullable until submission; canonical 10 ASCII uppercase alphanumeric characters; UNIQUE. |
| `amount_expected` | Immutable price copied from the database product at creation. |
| `status` | pending, submitted, verified, delivered, rejected, refunded. |
| `created_at`, `submitted_at`, `verified_at`, `delivered_at` | State timestamps with chronological consistency checks. |
| `admin_note` | Optional bounded private note for future authorized admin work. |

The owner's explicit `pending` status resolves the Phase 0 pre-submission question.
A pending order has no TrxID/submission time. A submitted row needs both. Verified
and delivered/refunded rows require verification time; delivered requires delivery
time. These are storage checks, not authentication or proof that money arrived.

`createPendingOrder` validates a strict Zod object, locks the active product and
inserts its price in a transaction. It accepts no price/status/code/TrxID fields.
The database trigger independently copies the active product price even if a
write supplies a forged amount. Order identity, product/code, creation time and
price cannot later be changed. Product price edits affect only new orders.

`normalizeTrxId` trims and uppercases; it does not remove internal spaces or
punctuation. PostgreSQL rejects noncanonical values and duplicate IDs even under
concurrent writes. An assigned TrxID cannot be changed/released. Rejected claims
also retain the ID; any correction/dispute policy must be reviewed before live use.
The conservative 10-character storage format is not a verified bKash API contract:
confirm the real manual payment method and accepted format before Phase 3/live use.
No payment claim API or manual verification handler exists yet.

Order codes use unbiased `crypto.randomInt`, eight characters excluding 0/1/I/L/O,
and bounded retries on the specific database UNIQUE collision. They are display
codes, not secrets. Phase 4 must require separate private access protection.

## Delivery codes — encrypted official voucher inventory

| Column | Meaning |
| --- | --- |
| `id`, `product_id` | Voucher identity and product reference. |
| `code_encrypted` | AES-256-GCM ciphertext envelope, never plaintext. |
| `status` | available or used. |
| `order_id` | Null while available; required while used. One code per order in the MVP. |
| `created_at` | Database creation time. |

A composite foreign key prevents assigning a code to an order for another product.
Ciphertext-format checks catch accidental plaintext; authentication happens only
when the AES-GCM utility decrypts. Actual inventory/fulfillment access belongs to
Phase 5 and must require authorized, manually verified orders. No seed codes exist.

Envelope: `v1.<base64url-IV>.<base64url-tag>.<base64url-ciphertext>`. Each encryption
uses a fresh 12-byte IV and 16-byte tag. Authenticated context must be the stable
`delivery-code:<UUID>` or `admin-totp:<UUID>` so swapping records/purposes fails.
ENCRYPTION_KEY must be canonical base64 of exactly 32 bytes, stored outside Git
and the database. Missing/wrong-length keys and wrong keys/tampered ciphertext
fail closed. Losing the key loses access to encrypted data. Plan private key
backup/rotation before any real voucher or TOTP storage; no real keys are created.

## Administrator users — identities only in Phase 2

| Column | Meaning |
| --- | --- |
| `id`, `email` | Administrator identity; trimmed/lowercase email is UNIQUE. |
| `password_hash` | Salted scrypt-v1 hash, N=131072, r=8, p=1, 64-byte output. |
| `totp_secret_encrypted` | Null before enrollment, encrypted after real Phase 5 enrollment. |
| `failed_login_count`, `locked_until` | Prepared lockout fields; zero/null initially. |
| `created_at` | Database creation time. |

There is no login/session/2FA implementation in this phase. An unenrolled identity
must never receive a session in Phase 5. Provision using `npm run admin:create`
in a terminal: hidden password plus confirmation; never arguments/env values.
The script validates inputs, hashes before storage and refuses duplicate email
without changing its password. No admin password or TOTP secret is seeded.

## Audit logs — accountable future administrator actions

| Column | Meaning |
| --- | --- |
| `id`, `admin_id` | Event ID and required administrator foreign key. |
| `action` | Bounded action name such as order.verified; never a free-form secret payload. |
| `order_id` | Optional order foreign key. |
| `ip` | Valid IP address in PostgreSQL inet format. |
| `created_at` | Database event timestamp. |

Administrator/order deletion is restricted while referenced. Action writing will
be transactional with authenticated Phase 5 mutations. Never log passwords, TOTP
secrets, voucher plaintext, full payment payloads or unnecessary customer details.
Client-IP trust/retention need review with the chosen deployment environment.

## Indexes and access

UNIQUE indexes enforce order_code, canonical trx_id, admin email and one voucher
per order. Foreign-key/listing indexes cover active products, product orders,
status/time queues, available voucher inventory, and administrator/order/time audit
lookups. Restrictive foreign keys preserve records instead of silently cascading.

RLS is enabled on all five tables with no public policies. Even a non-owner role
with table grants cannot read/insert rows; this is tested. The Next.js server reads
only a public projection of active products. Never put DATABASE_URL in a browser
bundle or connect a browser directly to privileged tables. Local migration/app
access owns the schema; create/review least-privilege live runtime roles before launch.

## Migrations and local commands

After filling the private local values described in README:

```bash
npm run db:start
npm run db:migrate
npm run db:seed
npm test
npm run dev
```

Fresh Compose initialization creates both ecommerce and ecommerce_test. Tests
wipe only the explicitly configured disposable loopback `_test` database. There
is no fallback to DATABASE_URL and no silent skipped integration tests.

`db:generate` creates reviewed changes from src/db/schema.ts; `db:check` checks
migration history; `db:migrate` applies committed SQL and can be rerun. Do not edit
committed/shared migrations: add a new reviewed migration. Static trigger SQL is
in 0001_order_price_guards.sql. `updated_at` and quote/TrxID guards run in PostgreSQL.
Stop with `db:stop`; keep the volume unless intentionally resetting disposable data.

## Future Supabase connection — no live connection in this phase

DATABASE_URL can use a Supabase server PostgreSQL URL. Remote connections always
use TLS with certificate/hostname verification; insecure sslmode values are rejected.
If the issuer needs a custom CA, use sslmode=verify-full and sslrootcert=/private/path/to/ca.pem.
The driver removes URL TLS overrides before applying verified Pool settings.
Do not set rejectUnauthorized=false to bypass certificate errors.

For future serverless app use, choose the supported transaction pooler and small
pool (production max 1); this layer uses unnamed parameterized queries, not named
prepared statements. Use MIGRATION_DATABASE_URL for the direct/session connection
required by migration tools. Review actual project certificates, roles, quotas,
RLS and provider terms before any authorized real connection. No service is connected.

Primary references: [Drizzle/PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql),
[migrations](https://orm.drizzle.team/docs/migrations), [constraints](https://orm.drizzle.team/docs/indexes-constraints),
[Node crypto](https://nodejs.org/download/release/v24.19.0/docs/api/crypto.html),
[OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
