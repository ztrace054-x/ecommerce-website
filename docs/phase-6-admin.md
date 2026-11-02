# Phase 6 — private administration with 2FA


## Follow-up review — 2026-11-02

The original six Phase 6 commits were preserved. Dependency-fix PR #5 passed
GitHub Actions and was merged as `279f2d8fbf843e15d93b6fc54a7a977a20cf107d`.
Post-merge main passed the full ordered baseline: locked install, lint, types,
37 tests (zero failed/skipped), production build, and zero audit vulnerabilities.
Main was merged normally into this branch as `4052187`; both progress notes were
retained when PLAN.md conflicted. No history was rewritten or force-pushed.
Before further changes, the updated Phase 6 branch passed all 44 existing tests,
production build and full audit. See docs/dependency-advisory.md for the dev-only
minimatch chains, upstream checks and scoped overrides.

This environment uses workspace-local Node 24.22.2 (official download checksum
verified) and native PostgreSQL 17, not the historical Docker container. A fresh
cluster was initialized under the workspace, listening only on 127.0.0.1:55432;
ecommerce_test was created with UTF-8 encoding and migrations 0001–0003 applied.
Only synthetic fixtures were used and smoke-test accounts/orders were removed.
No remote database was contacted.

### Targeted fixes

- Order/product mutations, password changes and logout lock the administrator
  first and recheck the full session inside their transaction. Expired, disabled
  or revoked authorization returns no data and cannot commit a later mutation.
  Expiry checks use clock_timestamp after lock waits. A mutation that already
  acquired the lock can finish before a concurrent revocation; revocation then
  prevents subsequent writes. Previously authorized in-flight reads may finish.
- 2FA uses the same administrator-before-session lock order as revocation and
  uses one captured timestamp for TOTP validation and the replay counter.
- Unknown admin API paths return 404 before parsing bodies. Every recognized
  admin POST requires an explicit allowed Origin; authenticated/pending POSTs
  also require their session CSRF token. The initial login is protected by
  Origin, JSON/body/schema checks, Turnstile and rate limits before a session exists.
- Privacy headers now cover boundary and rate-limit errors as well as successful
  handler responses. Nonce CSP is supplied by the existing Next.js proxy.
- Startup validates admin configuration through the existing order environment
  loader as well. Failed password-change attempts receive a safe audit event.

No older migration, existing test assertion, lint rule or audit gate was weakened.
No public signup, delivery automation, email or customer account was introduced.

### Fresh verification

| Check (ordered) | Result |
| --- | --- |
| npm ci | PASS |
| npm run lint | PASS |
| npm run typecheck | PASS |
| npm test | 57 passed, zero failed/skipped |
| npm run build | PASS, Next.js 16.4.3 |
| npm audit | 0 vulnerabilities |
| Environment guard | PASS |
| Production and development local servers | PASS |
| Interactive bootstrap in a pseudoterminal | Hidden password; one URI; eight unique recovery codes and eight stored hashes |

The 13 additional counted tests cover revocation between authentication and
mutation, disabled/expired sessions, a TOTP step boundary, concurrent one-time
recovery redemption, 2FA lockout, per-IP/account limits, all half-session routes,
strict cookie flags, Origin and 404 boundaries, allowlist/captcha failure and
missing production admin configuration. An initial test-fixture TypeScript error
(NODE_ENV inferred as string) was corrected with a literal type before rerunning
all checks. npm reports an Argon2 install-script approval warning on this npm
version; its packaged native binding loaded and all real Argon2 tests passed.

Production curl checks used real Cloudflare Siteverify with official always-pass
test keys, fresh in-memory synthetic credentials, and the loopback database:

| Request | HTTP |
| --- | --- |
| Admin page, nonce CSP and privacy headers | 200 |
| Unknown POST / unauthenticated orders / half-session orders | 404 |
| Missing Origin / missing CSRF | 403 |
| Password + Turnstile / TOTP / authenticated orders | 200 |
| Illegal transition / repeated verify | 409 |
| Verify / deliver / reject / refund | 200 |
| Product edit / audit viewer | 200 |
| Logout / subsequent access | 200 / 404 |

Four successful order actions produced four matching audit rows. Product edits
preserved both existing order prices. Server output contained none of the generated
password, TOTP secret or encryption key. Enrollment output was captured privately
for terminal assertions and was not printed in chat, committed or application-logged.
The curl harness sends cookies explicitly; it does not prove browser HTTPS-cookie
behavior. No TLS validation was bypassed and no CA trust changes were made.

New environment names remain ADMIN_SECRET_KEY, ADMIN_PATH_PREFIX and optional
ADMIN_IP_ALLOWLIST; templates remain blank. No further variables were added.

### Current security assessment and remaining checks

- Auth bypass — PASS in tested scope: both factors required, disabled/revoked
  identities denied, mutation authorization rechecked transactionally.
- Brute force — PARTIAL: IP/account/2FA limits and lockouts pass locally; verify
  trusted proxy headers, distributed replicas and operator lockout recovery.
- Session fixation/hijack — PARTIAL: rotation, hashed tokens, strict cookie flags,
  idle/absolute expiry and revocation pass; real HTTPS/browser behavior and stolen
  bearer-cookie exposure remain operational concerns.
- CSRF — PASS in tested scope: explicit Origin plus session token for protected
  POSTs; login additionally uses Turnstile before issuing a pending session.
- XSS — PARTIAL: actual detail-component escaping and nonce headers pass; rendered
  hostile text, Turnstile CSP interaction and mobile/keyboard flows need browser QA.
- SQLi — PASS in tested scope: bound SQL parameters and strict filters; hostile
  search/status inputs are rejected.
- Double-processing — PASS: row-locked transitions, database trigger and concurrent
  tests permit one verification; repeated HTTP verification returns 409.
- Secrets — PARTIAL: Argon2id, AES-GCM, hashed tokens/codes and hidden bootstrap
  verified; production key custody, rotation and backup recovery need operator review.
- Audit trail — PASS in tested scope: action and audit commit atomically; define
  retention, monitoring and least-privilege production database access.

Next: independent browser/HTTPS and deployment-security review, including proxy
headers, replica limits, Argon2 resource usage, backup/key recovery and retention.
Delivery-code storage remains a separately authorized future task. PR #4 must
remain open and unmerged; no deployment is authorized by this review.

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

## Original verification — October 2026

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
