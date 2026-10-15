# Deployment and activation

**Paused by the owner's latest instruction.** Phase 2 database/backend work is
authorized; deployment, publishing, Vercel connection and live provider setup
are not. The URL/status and procedures below are historical/future reference,
not authorization to publish current commits. See phase-2-foundation-audit.md.

The published private review of the existing application is:
https://ai-seba-marketplace.cwrtravel1102.chatgpt.site
The current hosting deployment was rechecked as `succeeded` on 14 October 2026; this confirms
publication, not actual provider/payment configuration.
Review hosting is separate from a commercial launch. Payment collection is
closed; the original sample catalog remains visible. Never place real customer
information in the sample form.

For standard Next.js deployment on Vercel, use [vercel-deployment.md](vercel-deployment.md).
It records the current branch, build override, environment requirements, verified
production smoke and exact manual workflow. Vercel account access is not connected
in the current task; this does not affect the existing private review URL.

## Connect the actual backend

1. Use the owner's Supabase project and a backed-up staging database first.
   From a Node 24 workstation, set its private, verified-TLS `DATABASE_URL` and
   run `npm run db:migrate`. The journal applies the unchanged original
   `0000_phase_2_schema` and `0001_order_price_guards`, then additive
   `0002_marketplace`; existing data is preserved. For an existing Phase 2
   database, retain its migration journal so only the additive entry runs.
   Never apply a replacement schema or run migrations as a browser user.
2. `npm run db:seed` is optional, non-destructive and creates no admin/order/code.
   The original seed contains two active sample C services and two inactive A/B
   examples. They remain preview data while approvals are absent. Storage prices
   are whole BDT; API amounts use exact integer poisha conversions. Review every
   description, price, duration, delivery and permission before publishing.
3. Disable public signup in Supabase Auth. Use `npm run admin:create` in a private
   interactive terminal to create an original local identity with a 15–128
   character password; it is inactive for web login. Separately provision the
   actual provider user with a strong password through a trusted owner workflow.
   Enroll and verify its TOTP factor using Supabase Auth's MFA enrollment API
   from a trusted authenticated setup tool/page. Use a separate provider login
   password; the local scrypt hash is never accepted as a provider credential.
   After enrollment, an authorized database operator links that user's UUID in
   `admin_users.auth_user_id` and sets `is_active=true` on the matching local row.
   Web login requires provider email/password plus the authenticator code.
   Never create a default admin, overwrite an existing hash, or share passwords,
   authenticator secrets or database/service keys in chat or Git.
4. In the host's runtime secret store set `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` (secret), and the exact `APP_URL` origin. All
   browser-facing requests use the application API; no public Supabase keys are
   required. On Sites use the environment-variable operation and redeploy to
   apply the new revision. On a standard Node host use its secret manager.
5. Configure a Turnstile widget for the actual origin, set its public site key
   and secret server key. The claim action is `payment_claim`; tokens must be
   validated for that action and hostname. There is no production test bypass.
6. Supply the real `BKASH_RECIPIENT_NUMBER` and confirmed
   `BKASH_PAYMENT_METHOD` (`payment` or `send_money`), support email and WhatsApp
   destination. Confirm the correct method and account eligibility with bKash.
   Confirm actual receipt TrxID formats. The retained 10-character alphanumeric
   syntax check is not bank validation or proof of payment.
7. Finalize policy text, retention/deletion, paid-claim correction, delivery and
   refund procedures. Review every offering's actual permissions. Only then set
   `POLICIES_APPROVED=true`, `CATALOG_APPROVED=true`. These are operator assertions,
   not a substitute for the review. No subscription or voucher inventory is seeded.
8. Configure `TRUSTED_CLIENT_IP_HEADER` only if the host strips and overwrites
   it on every request. Only `cf-connecting-ip` and `x-real-ip` are supported.
   If uncertain, leave it blank: anonymous clients share a conservative bucket;
   arbitrary forwarding headers cannot bypass rate limits.
9. Resolve the hosting build-chain `braces` advisory documented in security.md.
   Recheck current official Next.js/upstream advisories, apply required
   patched dependencies, run `npm run check` and the dependency audit, and run
   native PostgreSQL and staging browser/real-provider tests using synthetic data before accepting
   real customers. Confirm provider budgets, backups and hosting eligibility.
10. Set `CHECKOUT_ENABLED=true` only after these configuration requirements are
    met. The server still refuses checkout if required values/approvals are absent.

## Node hosting

Install Node 24, `npm ci`, configure runtime values, then `npm run build:next`
and `npm start`. Use HTTPS through the selected host/reverse proxy. The default
start command binds to loopback intentionally. Configure a host-specific bind
only when required, with an appropriate network boundary. Provider onboarding,
domain purchase and paid plans are not silently created by this project.

## Operations

- Before verifying, compare TrxID, sender, actual amount and recipient with the
  actual incoming bKash transaction. Click delivered only after service completion.
- A rejected TrxID remains unique. Payment corrections/refunds need a reviewed
  support procedure; the API does not delete history or reuse a transaction.
- Expired paid quotes require support review. Never tell a customer to pay twice.
  Checkout warns them to retain the code and complete submission without closing.
- Rotate service keys through the provider and host, then redeploy. Disable the
  admin allowlist entry to cut off that identity immediately; revoke all its
  session rows after password changes or suspected compromise.
- Expired rate-limit rows and unused expired quote sessions require periodic
  maintenance by a migration/operations role. Do not delete sessions referenced
  by orders. Apply the chosen customer/audit retention and backup policy before
  launch. No speculative personal-data retention period is imposed by the code.
- No email sending, automated bKash verification, web voucher delivery or refunds
  are enabled. The original encrypted voucher table/helper are retained and
  tested; they do not constitute a stocked or activated web voucher business.

## Verification limits

The automated suite uses a real local PostgreSQL engine (PGlite) with mocked
provider transport. PGlite serializes one connection: parallel promise tests
exercise unique constraints and idempotency, not independent production
connections or full Supabase operation. Repeat concurrency tests against staging
PostgreSQL and verify real provider authentication, token expiry and Turnstile.
The available managed environment has no supported control-browser capability;
new rendered browser and mobile interaction QA has not been performed.
