# Implemented security and launch limits

This document describes controls in the continuation source. Configuration and
actual-provider verification remain separate; a review build is not a commercial
security certification. Historical foundation evidence remains in the phase docs.

## Implemented controls

- Strict server schemas reject unexpected fields, constrain length/formats,
  normalize email/phone/TrxID and reject markup/control characters in text.
  The browser's validation is only usability; server checks are authoritative.
- JSON content-type/origin checks and actual streamed 16 KiB body limits (4 KiB
  login) apply before writes. Origin is compared to a configured exact origin;
  attacker-supplied Host/forwarding values are not used as production authority.
- Cookies are HttpOnly, SameSite=Strict and Secure on HTTPS. Mutations require
  Origin, so login/logout/status/product/note requests have CSRF protection.
- Web admin passwords are verified and bcrypt-hashed by Supabase Auth. An enrolled
  TOTP factor must be challenged and verified before an application session is
  created. The retained terminal CLI uses scrypt and creates an inactive identity;
  its password hash does not authorize provider login. Provider
  tokens are never sent in JSON or stored in localStorage. Every protected API
  verifies provider token, active allowlist membership and the unexpired,
  unrevoked DB session, including the original admin lock. There is no public signup, default password, browser-only
  role check or ADMIN_SECRET bypass. Sessions last at most one hour.
- Parameterized PostgreSQL functions enforce quote/session locking, unique
  canonical TrxIDs, positive integer prices, foreign keys, valid status/version
  checks and atomic status/note/audit changes. No client-supplied price is used.
- Anonymous/authenticated DB roles have no application table grants or RPC
  execute grants. RPCs are security invoker with an empty search path. A server
  service credential is required. Runtime audit/note grants exclude UPDATE/DELETE.
- Durable atomic PostgreSQL rate counters work across instances. No in-memory
  production fallback exists. Untrusted proxy headers are ignored; unknown
  clients share a conservative bucket. Production proxy trust needs host review.
- Turnstile is verified server-side for success, exact hostname and claim action.
  Missing/replayed/wrong-context tokens and provider/configuration failures deny
  the claim. The provider supplies token expiry/replay rejection. No bypass is
  included in production; test mocks exist only in the test suite.
- Tracking uses a 256-bit key, email and order code in a POST body. Hashes are
  stored; keys do not enter query strings, logs or browser storage. Tracking
  returns a minimal projection, excluding contact/payment/internal-note fields.
- React renders text with normal escaping. No raw HTML injection or user-supplied
  scripts are used. Input sanitization does not remove the need for escaping.
- Basic nosniff/frame/referrer/permission headers remain. API responses are
  private/no-store and generic errors never expose upstream secrets, SQL errors
  or submitted values. No application logger records PII or tokens.
- The committed environment template is blank and private files ignored. CI,
  strict types, dependency locking and environment checks are retained.

## Operational requirements

Apply the migration/grants in an actual staging Supabase project, disable public
signup, provision the real admin, set strong-password policies and protect/rotate
server service keys. Revoke sessions after password changes or incidents; disabling
an admin has immediate effect. Configure logging redaction at the chosen host too.
The code cannot configure provider account settings without the owner's account.

Confirm bKash account/method and receipt rules. The retained 10-character alphanumeric
TrxID check bounds input; it does not assert bKash authenticity or prove payment.
A human must compare the actual transaction/recipient/sender/amount before
verification. A rejected TrxID stays unique. Correction/refund and retention
procedures must be finalized; no deletion or refund shortcut is exposed.

Only manual delivery of the existing service categories is implemented. There is
no voucher inventory to encrypt, subscription/seat resale permission assertion,
third-party password field, automated bKash verification or outbound email sender.
The original AES-GCM helper and encrypted voucher table are preserved and tested,
but no voucher web operation is enabled. Resend remains reserved.

Keep the review deployment private and payment collection disabled. Before public
launch, verify real-provider/staging concurrency and browser/mobile behavior,
HTTPS/HSTS/CSP and hosting eligibility/backups/retention. A complete nonce-based
CSP is not claimed: the existing basic headers are not a substitute for it.

## Verified upstream notice

On 13 October the official Next.js blog confirmed an upstream security release
planned for 14 October, with two Critical and one High issue. Affected versions
and fixes are not published yet. Recheck the advisory and patch before enabling
commercial checkout; do not claim current installed dependencies are immune.
https://nextjs.org/blog/upcoming-nextjs-security-update-october-2026

The 13 October full dependency audit flags `GHSA-vfj7-8cjw-p6xm` in `braces`
3.0.3 through Vinext's build-plugin/glob chain. It reports six affected package
entries for that one advisory. The upstream advisory lists no patched version;
the current registry latest is 3.0.3. No forced adapter downgrade or audit
suppression is applied. `npm audit --omit=dev --audit-level=moderate` is clean
for the standard Next.js runtime; that does not certify the bundled Worker.
Keep this owner-private review separate from a commercial launch and resolve
the adapter chain before release. The full CI dependency audit remains blocking.
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

## Tests and limitations

The suite uses synthetic information, the actual local PostgreSQL engine via
PGlite and mocked Supabase/Turnstile transport. It covers unknown fields, price
manipulation, TrxID conflicts, unauthorized roles, CSRF, request size, rate limits,
provider failure/replay, tracking privacy, session revocation, transitions and
rollback. PGlite uses a single connection; production concurrency and provider
configuration require actual staging checks. New browser QA is unavailable in
this environment and is not inferred from a successful build.

References: Supabase password security/database function documentation and
Cloudflare Turnstile server validation are linked in the architecture document.
