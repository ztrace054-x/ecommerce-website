# Phase 8 security review — 2026-11-05

Scope: main `97537a667a10695ddf17d852e9a6e2ac5a55ac68` (owner-merged PR #6),
all `src/`, scripts, four migrations, Next configuration/proxy, dependency tree,
workflows and local Git history. No deployment, remote database, real customer,
payment, voucher, email or production credential was used. Findings were reported
before fixes. This is an internal review, not an independent penetration test.

## Findings

Locations below refer to the reviewed baseline, before fixes.

| ID | Severity | Location | Exploit / failure | Resolution |
| --- | --- | --- | --- | --- |
| S1 | High | `src/lib/delivery/store.ts:69–84` | Email drops order/code locks before provider I/O; another administrator can void/refund the selected code before it is sent. | Fixed in `7ce7d17`: hold transaction locks through the bounded provider request, check reserved state; two-admin lock-wait regression. |
| S2 | Medium | `src/lib/admin/handler.ts:60–106` | Authenticated mutations lack a shared quota, allowing repeated costly writes, reveals and audits. | Fixed in `4a2fff7`: IP and authenticated-account POST budgets, 60/10 minutes and 1,000/day; existing login/2FA/password/email limits retained. |
| S3 | Medium | `src/lib/admin/store.ts:86–101` | Refund strands a reserved code that can no longer be voided through the UI. | Fixed in `7ce7d17`: retire reservation and audit within refund transaction; never recycle a potentially disclosed code. |
| S4 | Medium | `src/lib/admin/store.ts:25` | Requests during an active lockout extend the deadline indefinitely. | Fixed in `4a2fff7`: attempts during the active lock do not change its deadline/count; wrong passwords still lock after five failures. |
| S5 | Medium | `src/lib/delivery/store.ts:80–82` | Redacted preview includes arbitrary product instructions/name; pasted sensitive content can reach logs. | Fixed in `7ce7d17`: fixed event plus redaction marker only; no recipient, order code, product or instructions. |
| S6 | Low | `src/lib/orders/tracking-store.ts:25` | A one-character email local part is returned without masking. | Fixed in `51e5258`; actual delivered-order lookup regression. |
| S7 | Low | JSON parsing in order/track/admin handlers | Duplicate keys silently select the last value, creating ambiguity for upstream validation. | Fixed in `5c29ca9`: reject duplicate/escaped duplicate keys, prototype keys, invalid UTF-8 and nesting over 32; retain 10 KiB streamed body limit. |
| S8 | Low | `src/components/admin-panel.tsx:18` | Upload reads event.currentTarget after await and loses its success notice; operator can mistakenly retry. | Fixed in `51e5258`: capture form before await, reset it, refresh and then show counts. Clear revealed code on detail refresh. |

## Review coverage and trust boundaries

- **Injection:** runtime PostgreSQL tagged templates and Drizzle SQL parameterize
  values. The only `unsafe` call executes checked-in, checksummed migration DDL;
  no request data enters it. SQL payloads in identifiers are rejected; free text
  persists literally. No raw query or database errors are returned by APIs.
- **XSS:** React text children/attributes render customer names, notes, product
  descriptions, tracking and audit fields. No `dangerouslySetInnerHTML` or HTML
  interpretation. Email escapes all inserted HTML; support links use configured
  numeric WhatsApp destinations. Tests render the real AdminFields component.
  Production CSP uses fresh request nonces and no unsafe-inline/unsafe-eval.
  Development-only allowances are not production settings. Root layout is dynamic.
- **CSRF:** every admin POST requires explicit allowed Origin and, after login,
  the session-bound CSRF token. Public unauthenticated POSTs require JSON and an
  allowed Origin (same-origin Referer fallback), plus Turnstile; there is no ambient
  customer authority to exercise. No server actions or alternate mutation routes.
- **Authentication/access:** the admin page is a public login shell with no data;
  admin data/actions require a full password+TOTP/recovery session. Pending sessions
  can only complete 2FA. Unknown routes return 404. Administrators share the same
  authorized management role, so cross-admin order access is intentional.
  Missing and wrong login credentials produce the same error and Argon2 work;
  tracking uses a fixed-size timing-safe suffix comparison and identical not-found
  bodies. Database existence/timing and lock contention are not constant-time.
- **Sessions/crypto:** 256-bit random tokens and recovery codes stored hashed;
  session rotation after 2FA, one-use recovery redemption, TOTP replay rejection,
  8h absolute/30min idle expiry, five-minute pending sessions. Secure HttpOnly
  SameSite=Strict `__Host-` cookie; revocation is rechecked inside mutation locks.
  Argon2id uses 64 MiB, three iterations and one lane. AES-256-GCM uses domain AAD
  and fresh 96-bit IVs; delivery IV uniqueness is enforced in PostgreSQL. Separate
  randomly generated 32-byte admin/delivery keys are an operational requirement.
  Delivery fingerprints and IP identities use HMAC; no raw IP in audit records.
- **Business rules:** database price snapshot, normalized unique TrxID, explicit
  transitions, manual verification, product-matched available-code selection,
  row locks and same-transaction audits. Delivered refunds are denied. Concurrency
  tests use distinct administrators to avoid mistaking the admin lock for the
  inventory lock. Browser-supplied admin IDs, prices and statuses cannot bypass
  strict schemas. No method-override support.
- **Rate limits:** PostgreSQL advisory locks serialize each identity's sliding
  window across replicas. Login has IP/account limits; 2FA/password retain stricter
  account limits; shared budgets now cover every known admin POST. Invalid Origin,
  content type, size and unknown routes reject before expensive business work.
  Tracking retains five failures per code across IPs and ten attempts/IP/10min.
- **Headers/errors:** CSP frame-ancestors none, DENY, nosniff, HSTS, permissions
  restrictions, no CORS. Admin/track use no-referrer; private/no-store responses,
  noindex. Generic API failures; production framework errors omit stack details.
  Stream size and schema lengths/array sizes bound input; control characters in
  names, email header injection and Unicode identifier tricks are tested.
- **Secrets/config:** environment values load only on the server; the sole public
  variable is the Turnstile site key. Runtime startup validates required settings;
  local smoke exceptions require loopback and are prohibited on Vercel. The bootstrap
  script requires a private TTY and hidden password/confirmation; enrollment output
  is intentionally shown once to that operator, never logged by the application.
  Preview email mode is explicitly non-delivery; a missing Resend key uses that mode.

## Dependencies and workflow

Baseline and final audit results are recorded below. `npm outdated` identified
available updates: Argon2 0.45.2, Next 16.4.5, React/React DOM 19.3.1, OTPAuth 9.6.0,
globals 17.14.0, PostgreSQL client 4.0.0, TypeScript 7.0.2, Node types 26.6.6.
No advisory required these upgrades at review time. Keep Node-24 types aligned with
Node24; review major upgrades separately. Dependabot now checks npm and Actions
weekly. Do not blindly upgrade security dependencies or remove minimatch overrides.

Reviewed Argon2 0.45.1's install command: `cross-env ZERO_AR_DATE=1 node-gyp-build`.
It loads/tests the packaged native binary or builds it locally. Approve only this
locked version in `package.json` (`allowScripts`); `.npmrc` now sets
`strict-allow-scripts=true`. No blanket approval, ignore-scripts or skipped checks.
Any new/version-changed install script needs review. See
[npm install-script policy](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/).
The clean install and real password tests verify the native module works.

CI has read-only contents permission, full-SHA-pinned checkout/setup-node actions,
no persisted checkout credentials, no pull_request_target, no production secrets,
a loopback disposable PostgreSQL service and a 15-minute timeout. PRs targeting
main trigger all checks; push's historical `phase-*` pattern does not match `feat/*`,
but this does not exclude their pull_request checks. The PostgreSQL 17 service tag
is mutable; pin a reviewed multi-platform digest if immutable CI images are required.

## Logging and proposed retention

Application audit rows contain action, admin/order IDs, timestamp and hashed IP;
tracking stores a keyed code hash. No password/session/recovery/TOTP/voucher plaintext
belongs in logs, notes or audit rows. Exception handlers intentionally omit driver
errors. Preview logs contain only a fixed event and redaction marker.

Before real use the owner must approve a retention policy and configure an
operator-owned scheduled cleanup (not the app's DB role): delete rate events older
than 24 hours daily; delete expired sessions daily; remove tracking-limit rows only
when their lock has expired and their window is older than 30 days; retain security
audits 90 days unless an incident/legal obligation requires preservation. Orders,
refund evidence and backups need a separately approved business retention period.
Do not delete customer/order records or audit evidence automatically in this phase.
Restrict log access and apply the same retention to log exports/backups. The app
role should not have DELETE on audit_logs; maintenance uses a separate role.

## Remaining risks and manual preview checks

- Account/code-wide lockouts intentionally trade availability for brute-force
  resistance. The fixed deadline prevents extension *during* a lock, but an attacker
  can trigger a new lock after expiry. Keep Turnstile, IP quotas, private Deployment
  Protection and optional admin IP allowlist; monitor repeated lockouts and use a
  private operator recovery process. Do not remove the cross-IP code lock while
  tracking uses a four-digit factor. A future high-entropy tracking credential
  would permit safer targeted throttling without exposing customer data.
- Vercel must overwrite the selected `x-forwarded-for` header and prevent direct
  origin access. Local tests reject malformed/chained headers and ignore alternatives;
  they cannot prove hosted overwrite behavior. A valid spoofed selected header is
  indistinguishable in a raw local Request. Verify with two clients and forged
  header values on the protected preview, following
  [Vercel's request-header contract](https://vercel.com/docs/headers/request-headers).
- Email holds row locks during a request bounded by the sender's 10-second timeout;
  this favors correctness over throughput. Provider acceptance followed by timeout,
  process death or database commit failure still has an uncertain outcome. Never
  blindly resend after uncertainty: reconcile the provider dashboard privately.
  The three-attempt cap remains. A durable outbox/provider idempotency design is
  recommended before real delivery volume; this review does not claim exactly-once
  delivery. Voiding a code cannot revoke a message already accepted by the provider.
- Browser HTTPS enforcement of __Host cookies, actual Turnstile loading under CSP,
  browser nonce behavior, mobile upload/clipboard, and provider domain authentication
  remain manual. Curl checks cookie attributes but is not a browser cookie policy test.
- Configure private reporting contact, protected preview access, least-privilege DB
  role/RLS, key backups/rotation, Resend SPF/DKIM/DMARC and production Turnstile
  hostnames per the deployment guide. Verify multiple instances share limits.
- Policies/catalog still identify this as a synthetic demo. Do not accept real
  payments until product permissions, bKash format, customer disclosures and refund
  policy are approved. This phase did not authorize a launch.

## Verification

- Main baseline: locked install, lint, typecheck, **64/64** tests, build and npm audit
  passed; zero failures/skips, zero vulnerabilities.
- New isolated security suite: **15/15** passed. All original tests remain enabled;
  `npm test` explicitly includes `tests/security/*.test.ts`.
- Initial full-history Gitleaks: **54 commits, 0 findings**, all local refs/branches.
- Final ordered baseline: `npm ci` installed 141 packages and audited 142;
  lint and typecheck passed; `tests 79`, `pass 79`, `fail 0`, `skipped 0`;
  Next 16.4.3 production build passed; `found 0 vulnerabilities`.
- Production curl scan: **PASS (72 HTTP assertions)**, nonce/header checks and
  synthetic auth/order/delivery flow. Login used the actual Cloudflare TEST
  Siteverify endpoint; email used log-safe mode, not Resend. Development home
  returned HTTP 200. Environment-file guard passed.
- Final diff/history secret scans: recorded in the PR after the final commits.

Run `node scripts/security-smoke.mjs` after a build for the reproducible production
curl fallback. It binds only 127.0.0.1:3108, hardcodes the loopback test database,
generates ephemeral synthetic credentials in memory, uses official Cloudflare TEST
Siteverify, sends no Resend emails, suppresses sensitive output and cleans fixtures.
ZAP and Docker were not installed locally, so the curl fallback is used. It covers
all public pages/product instances, checkout, tracking, unknown paths, both public
APIs, every admin API name, encoded paths, methods, security headers, nonce coverage,
malformed/oversized JSON, unauthenticated/half-session access and the synthetic
login/2FA/order/verify/assign/reveal/email/deliver/track/reject/refund/logout flow.
