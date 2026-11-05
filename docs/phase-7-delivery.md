# Phase 7 — delivery codes, email and WhatsApp

This branch adds the delivery flow to the Phase 6 private admin panel. Do not use
real customer orders or voucher codes for local verification.

## Configuration

New server-only environment names are `DELIVERY_CODE_KEY`, `EMAIL_FROM` and
optional `EMAIL_MODE`. `DELIVERY_CODE_KEY` must be a separately generated 32-byte
base64 key; keep it outside the database and repository and maintain a secure
backup. `EMAIL_FROM` is a verified sender address. `EMAIL_MODE=log-safe` records
only a redacted email preview. `EMAIL_MODE=resend` sends through the server-side
`RESEND_API_KEY`. Missing key or sender configuration fails production startup.
`.env.example` contains names only and blank values.

Run migrations 0001–0004 with the migration role before starting the application.
Migration 0004 adds product delivery instructions, email attempt records and the
encrypted code inventory. Do not edit or rerun older migrations against production.

## Delivery operations

- Add up to 100 voucher codes per request under the authenticated admin session.
  Inputs are normalized and validated; duplicate uploads are detected with a
  keyed HMAC fingerprint. Responses and list pages show counts/status only.
- The stock view reports available, reserved, delivered and void counts. Fewer
  than five available codes displays a low-stock warning.
- A verified order can reserve one available code in a locked transaction. Repeat
  clicks return the existing reservation. Reveal is a no-store POST and writes an
  audit row for every reveal. Never put codes in URLs, logs, audit data or tracking.
- Voiding an available/reserved code requires a reason. An assigned code is
  unassigned while the order remains verified so another code can be assigned.
- Email is explicitly requested by an admin for a verified order with a reserved
  code. Only the stored customer email is used. Each order permits three attempts;
  provider failures return a generic error and leave order state unchanged. The
  email contains escaped text/HTML and no remote images or tracking pixels.
- WhatsApp opens a prefilled status message without the code. A separate deliberate
  copy action is available after the admin reveals the code. Tracking shows a
  masked delivery destination and never returns the code.

## Local verification

Use only loopback PostgreSQL database `ecommerce_test` on port 55432 and official
Cloudflare Turnstile test keys. The delivery tests mock the Resend sender; they do
not call Resend. The test suite checks AES-GCM tamper rejection, unique IVs,
duplicate uploads, concurrent reservation, authorization/CSRF, reveal audits,
email escaping/recipient/rate limit/failure handling, voiding and tracking privacy.

The production HTTP smoke flow is upload → verify → assign → reveal → send in
log-safe mode → mark delivered. Use synthetic data and a temporary test key only.
Never store or print the login password, TOTP seed, recovery codes, encryption key,
or submitted voucher values in a shell transcript or report.

## Remaining manual checks

- Verify the Resend sender domain and configure SPF/DKIM before enabling live email.
- Back up the delivery key securely and rehearse recovery/rotation before importing
  real codes. A lost key makes stored vouchers unrecoverable.
- Review WhatsApp phone-number formatting, CSP/Turnstile browser interaction,
  HTTPS cookie behavior, proxy trust, database role/RLS policy, and retention in a
  private preview before production use.

## Verification results — 2026-11-04

Step 0 confirmed private PR #4 merged into main at `b062fe0f61d7f3a0c13f04422349bc56c535d9f9`.
Main contained the Phase 6 admin panel and migrations 0001–0003, but no delivery
code table. PostgreSQL 17 ran locally on 127.0.0.1:55432; migration 0004 applied.
The unchanged main baseline passed locked install, lint, type-check, 57 tests,
production build and npm audit with zero vulnerabilities.

| Branch check, in order | Result |
| --- | --- |
| `npm ci` | PASS; 141 packages; npm emitted its Argon2 install-script approval notice |
| `npm run lint` | PASS, zero warnings |
| `npm run typecheck` | PASS |
| `npm test` | 64 passed, zero failed/cancelled/skipped |
| `npm run build` | PASS, Next.js 16.4.3 production build |
| `npm audit --audit-level=moderate` | PASS, 0 vulnerabilities |
| Production-build HTTP smoke | PASS: admin page, password+TOTP, upload, verify, assign, audited no-store reveal, redacted email preview, deliver, masked tracking and illegal-transition 409 |

The HTTP smoke used only loopback PostgreSQL, synthetic account/order/code data,
official Cloudflare TEST keys in the loopback-only local smoke mode, and log-safe
email. It confirmed no generated password, TOTP seed, encryption keys, code or OTP
appeared in server output. The full suite includes the real local database
concurrency and email-mock cases. This is not live-service, browser-cookie, domain
authentication or production-key recovery evidence.
