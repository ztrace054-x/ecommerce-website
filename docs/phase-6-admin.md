# Phase 6 — private administration with 2FA

The owner authorized this phase after PR #3 merged as
`be795e093efc54ce8829f00976725add18c42aa9`. No further merge or revert was performed.
The stopped local `ecommerce-phase4-test` PostgreSQL 17 container was restarted
with `docker start ecommerce-phase4-test`. `pg_isready -U postgres -d ecommerce_test`
reported accepting connections. It binds only 127.0.0.1:55432. The migration runner
confirmed 0001 and 0002. Clean main passed locked install, lint, types, all 37 tests
(no failures/skips), build, and audit (zero vulnerabilities). Only the blank
.env.example template was tracked; repository privacy was confirmed.

## Scope and operation

This branch adds administrator bootstrap, password plus TOTP/recovery login,
opaque server sessions, order review/actions, product editing and a read-only audit
viewer. Existing origin/JSON/body boundary, Turnstile verifier, PostgreSQL limiter,
IP hashing and nonce CSP are reused. Argon2 0.45.1 and OTPAuth 9.5.2 are the only
new direct dependencies. No public registration route, customer accounts, email,
automatic delivery or delivery-code storage is added. No delivery-code table
existed; encrypted code delivery is a later task.

New environment names (server only):

- `ADMIN_SECRET_KEY`: securely generated 32-byte base64 AES key, backed up privately.
- `ADMIN_PATH_PREFIX`: single path segment such as `/manage-x7`; required explicitly
  in production. Development default is `/manage-x7`.
- `ADMIN_IP_ALLOWLIST`: optional comma-separated exact IPv4/IPv6 addresses (no CIDR).

Keep existing Phase 4 production configuration: DATABASE_URL, IP_HASH_SECRET,
TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, SITE_ORIGIN,
ADMIN_WHATSAPP_NUMBER, BKASH_RECIPIENT_NUMBER; set TRUSTED_PROXY_MODE=vercel and
ALLOWED_ORIGINS if needed. Never deploy LOCAL_ORDER_SMOKE or test keys. No session
signing secret is needed: random session tokens are stored hashed in PostgreSQL.
Missing/invalid admin configuration fails closed; `scripts/check-env.mjs` checks
new required names in production. Templates have blank placeholders only.

Run `npm ci`, configure the database securely, and run `npm run db:migrate` before
serving this branch. Migration 0003 adds RLS-protected admin tables, verification
attribution/rejection reason, and a transition trigger. Older migrations were
not edited. Only the disposable local test schema was recreated while developing
0003; no remote database was accessed. Use a restricted application role and a
separate migration role in production; configure explicit RLS privileges for that
role. Back up before production migration. This branch is not deployed.

Run `node scripts/create-admin.mjs` interactively in a private terminal on the
trusted server/local administration host with DATABASE_URL and ADMIN_SECRET_KEY
configured. It accepts no command-line arguments, prompts for email and a hidden
password plus confirmation, requires 14–256 characters and rejects common phrases,
and uses Argon2id (64 MiB, 3 iterations, parallelism 1). It prints the enrollment
URI and eight random recovery codes once, directly to that operator's terminal.
Do not capture that output in logs or this chat. Store recovery codes offline.
The application stores only AES-256-GCM encrypted TOTP secrets and SHA-256 hashes
of random recovery codes. Wrong encryption keys fail authentication closed; key
rotation needs an explicit decrypt/re-encrypt maintenance procedure.

The hidden path is obscurity, not authentication. Unknown prefixes return 404;
an optional IP allowlist is applied to page/API access. The page initially exposes
only a login form; all data APIs require a complete server-side session.

## Authentication and authorization

Login always verifies Turnstile with action `admin`. Password failures use the
same generic response for unknown and known users and perform an Argon2 dummy
comparison for unknown users. PostgreSQL rate limits apply per IP and account;
five password failures trigger progressively longer account locks, capped at an
hour. Second-factor failures are rate-limited and lock for 15 minutes after five.
Lockouts can be abused for denial of service: plan an operator recovery procedure.

Pending 2FA sessions last five minutes and cannot access data APIs. TOTP uses a
30-second period and a +/-1-step window; a per-user high-water counter blocks
replay, including concurrent requests. Recovery codes are consumed transactionally.
Completing 2FA deletes the pending session and issues a fresh 256-bit token.
The cookie is __Host-admin, Secure, HttpOnly, SameSite=Strict, Path=/, with eight-hour
absolute expiry. Server-side idle expiry is 30 minutes. Sessions bind the user-agent
hash, while IP hashes are recorded without forcing a fixed-IP session. Logout
deletes the session; password changes require the current password and invalidate
all sessions. CSRF tokens are random per session, stored hashed, returned only to
the authenticated/pending login caller and held in client memory. Subsequent POSTs
require that token plus the existing origin boundary. Reloading the admin page
requires logging in again to acquire an in-memory CSRF token.

All admin HTML/API responses inherit no-store, noindex, no-referrer, DENY and nonce
CSP. No password/hash/encrypted seed/recovery code is returned through data APIs.
Session/CSRF material necessarily travels to its login caller; it is never logged.

## Manual workflow and integrity

Open Orders to load the newest 25 records; filter by status/date or exact order
code/last four characters of TrxID or phone. Detail shows only the requested
customer/payment fields. Compare TrxID, amount and sender in the bKash app before
verifying. Submitted -> verified/rejected; verified -> delivered/refunded;
rejected -> refunded. Rejection requires a reason; refund requires a note.
An order row lock serializes decisions, and each action and audit write share a
transaction. The database trigger independently rejects illegal transitions.
No automated payment verification or delivery occurs.

Products can edit name, description, integer BDT price and active flag. Existing
orders retain their amount snapshot. Audit records contain actor, fixed action,
order reference where applicable, hashed IP and timestamp; no raw IP, credentials,
customer text, TOTP or recovery codes are logged. Reads also emit a generic admin
read event. Product audit entries record the actor/action, not a full before/after
revision history. Customer text and notes use escaped JSX, never raw HTML.

## Verification

All changes passed locked install, lint, types, **44 tests (0 failed/skipped)**,
production build, and npm audit (**0 vulnerabilities**). The original 37 remain;
the status-message test now inserts independent fixtures rather than performing
transitions forbidden by the new trigger. Assertions were preserved. One lint
failure (redundant boolean initialization) was corrected and checks rerun.

New tests exercise generic login errors, five-failure lockout, TOTP replay,
one-time recovery, half-session denial, rotation, CSRF, wrong origin, protected
APIs, expiry, logout, password-change revocation, SQLi filters, concurrent verify,
invalid transitions, atomic audit, safe response fields, price snapshots and actual escaped detail-component rendering.

Production HTTP checks used synthetic credentials, local PostgreSQL and real
Cloudflare Siteverify with official always-pass test keys:

| Check | Actual HTTP status |
| --- | --- |
| Admin page | 200 |
| Unknown admin path | 404 |
| Unauthenticated orders | 404 |
| Password + Turnstile | 200 |
| Half-session orders | 404 |
| TOTP | 200 |
| Authenticated orders | 200 |
| Missing CSRF | 403 |
| Logout | 200 |
| Logged-out session | 404 |

## Review and remaining checks

| Area | Assessment |
| --- | --- |
| Auth bypass | PASS in tests: complete 2FA session required; hidden path is not trusted. |
| Brute force | PARTIAL: DB limits/lockouts tested; verify deployed proxy headers and replicas. |
| Session fixation/hijack | PARTIAL: rotation, hashed tokens, secure cookie, idle/absolute expiry; stolen live cookies remain bearer credentials. |
| CSRF | PASS in tests: per-session header token plus origin and SameSite Strict. |
| XSS | PARTIAL: plain JSX, strict formats and CSP; complete real-browser hostile-text/widget validation pending. |
| SQLi | PASS in tests: parameterized queries and strict filters. |
| Double-processing | PASS: concurrent verification produces one success, one 409; DB transition trigger. |
| Secrets | PARTIAL: encrypted TOTP, Argon2id and hashed random tokens/codes; real key custody/rotation and terminal provisioning require operational review. |
| Audit trail | PASS in tested scope: transactional writes and safe fields; define retention/monitoring. |

**pending: verify manually in a real browser**: Turnstile widget under nonce CSP,
secure-cookie behavior on real HTTPS, full mobile/keyboard admin workflow, and
malicious customer/note rendering. No proxy CA was imported/trusted and no captcha
bypass or TLS verification bypass was used for live tests. Tests inject outcomes
only for deterministic integration branches. Independently review bootstrap CLI
terminal behavior, backup/encryption-key recovery, exact Vercel header behavior,
allowlist configuration, session revocation during in-flight concurrent requests,
Argon2 resource usage under serverless concurrency, bKash TrxID format, retention
and rate limiting across replicas before deployment.

Next recommended task: independent security/operational review and the pending
browser/deployment checks, then separately approved encrypted delivery-code flow.
Do not merge this Phase 6 PR without the owner's approval.
