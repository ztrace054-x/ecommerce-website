# Private Vercel preview deployment guide

Prepared 2026-11-05 for Phase 7. This is an operator runbook, not authorization to
create resources or deploy. Use a dedicated preview project/database and synthetic
orders and vouchers. Keep PR #6 unmerged. Never connect the automated tests to a
remote database: their fixtures delete/truncate tables.

## Environment inventory

Vercel Preview builds run with production runtime validation. Required values below
must be configured before starting the app; a successful build alone does not prove
startup configuration is complete. Keep `.env.example` blank. Never paste values in
Git, chat, tickets, command arguments or build logs.

| Name | Required / purpose | Visibility and safe source |
| --- | --- | --- |
| DATABASE_URL | Required; PostgreSQL connection with TLS and restricted app role | Server secret; obtain endpoint from Supabase Connect, provision a separate role/password; URL-encode password |
| ADMIN_SECRET_KEY | Required; encrypts admin TOTP seeds, exactly 32 bytes in base64 | Server secret; independently generate with `openssl rand -base64 32` |
| DELIVERY_CODE_KEY | Required; encrypts vouchers and keys duplicate fingerprints, exactly 32 bytes in base64 | Server secret; independently generate with `openssl rand -base64 32`; never reuse admin key |
| IP_HASH_SECRET | Required; HMAC for IP/account rate-limit identities, at least 32 characters | Server secret; independent `openssl rand -base64 32` |
| TURNSTILE_SECRET_KEY | Required; server Siteverify validation | Server secret from a production Cloudflare widget |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Required; widget site key | Public, intentionally visible in browser; paired Cloudflare widget key |
| SITE_ORIGIN | Required; exact stable HTTPS preview origin, no path/trailing slash | Server configuration; public address |
| ADMIN_PATH_PREFIX | Required in production; one segment matching `/[a-z][a-z0-9-]{5,63}` | Server configuration, observable in browser; choose a random suffix (e.g. `openssl rand -hex 12`); not an authentication secret |
| ADMIN_WHATSAPP_NUMBER | Required; real controlled support number matching `8801[3-9]` plus 8 digits | Server configuration rendered publicly; no `+` or spaces |
| BKASH_RECIPIENT_NUMBER | Required; owner-controlled number matching `01[3-9]` plus 8 digits | Server configuration rendered publicly; verify ownership; no real payments in preview |
| EMAIL_FROM | Required in production; plain sender email address | Server configuration, visible to recipient; use verified Resend domain |
| TRUSTED_PROXY_MODE | Set explicitly to `vercel` | Server configuration; `local` is forbidden on deployment |
| ALLOWED_ORIGINS | Optional comma-separated exact HTTPS origins; SITE_ORIGIN is included automatically | Server configuration; only specific controlled preview origins, no wildcards |
| ADMIN_IP_ALLOWLIST | Optional exact IPs separated by commas; no CIDR | Server configuration; enable only after verifying proxy IP behavior and operator access |
| EMAIL_MODE | Optional, defaults to `log-safe`; explicitly keep preview on `log-safe` | Server configuration; `resend` enables real sends only with an API key |
| RESEND_API_KEY | Conditional for actual sends; empty means redacted preview even in resend mode | Server secret; create a narrowly scoped sending key for the verified domain |

Generate keys only in a private, non-recorded terminal and save directly to an
approved password manager. Never generate them in CI. Use separate secrets for
Development, Preview and Production. Only the site key gets a NEXT_PUBLIC prefix;
contacts and origins are nonsecret even though configured server-side.

Do not set LOCAL_ORDER_SMOKE or ALLOW_LOCAL_SEED on Vercel. Do not use test Turnstile
keys there. ADMIN_SECRET and ENCRYPTION_KEY are legacy template placeholders and
are not runtime substitutes for the required keys above. Supabase anon/service-role
API keys are not needed: this application uses PostgreSQL directly. Leave NODE_ENV,
VERCEL and NEXT_RUNTIME to the platform.

## Vercel setup, when deployment is authorized

1. Import the private GitHub repository into a project accessible only to approved
   team members. Select Next.js, repository root, Node.js **24.x**, install command
   `npm ci`, build command `npm run build`, and framework-default output settings.
   Retain the full GitHub CI gate separately; do not run database tests in Vercel.
2. Before the first deploy action, enable **Deployment Protection / Vercel
   Authentication** for all preview URLs (prefer all deployments). Verify the
   chosen plan supports the intended scope. Do not create public exceptions or
   share bypass links. If import requires deploying before these settings can be
   established, stop and arrange a protected project first.
3. Add the above configuration under **Preview**, scoped to this branch when
   available. Never copy production DB credentials into preview. Keep main as the
   production branch; deploy `feat/phase-7-delivery` only as a Preview when approved.
   Do not promote or merge. Prevent automatic production deployment during setup.
4. Choose one stable preview hostname and configure SITE_ORIGIN and Turnstile for
   it. Generated deployment URLs also need explicit allowed-origin/hostname setup
   if tested directly. Redeploy after changing environment variables, particularly
   public variables captured at build time.
5. In an unauthenticated browser, verify every deployment URL, alias and API path
   is intercepted by protection. Then sign in through approved Vercel team access.
   Repository privacy alone does not protect a deployed website.

See [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection).

## Supabase database and migrations

Create an isolated preview Supabase project in a region close to the Vercel
functions. Use synthetic data only; enable backups appropriate to the plan and
verify a restore before storing real vouchers in any future production system.
Copy connection parameters from Connect; require TLS with server certificate
verification using the provider CA as needed. Never disable certificate validation.

Use a direct connection for migrations/admin bootstrap, or the session pooler if
the operator host cannot reach the direct IPv6 endpoint. Use the transaction pooler
for serverless app traffic. Its custom-role username includes the project reference;
copy the correct form from the provider instructions. App clients already disable
prepared statements (`prepare:false`); migration/bootstrap clients do not, so keep
those on direct/session connections. Each app instance creates several pools with
up to five connections each: budget total concurrency against pooler/backend limits,
monitor saturation, and review limits before load. Transaction advisory locks used
by this app remain scoped to a transaction.
[Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).

Before migration, record the target project ID and reviewed Git SHA, take a backup,
and inspect `app_migrations` if it exists. Load a migration-role DATABASE_URL through
a private secret-manager environment or a hidden shell prompt, not a literal command:

```bash
read -r -s -p 'Migration DATABASE_URL: ' DATABASE_URL
export DATABASE_URL
npm ci
npm run db:migrate
unset DATABASE_URL
```

Run this from a reviewed checkout on a trusted machine. The runner applies
0001_orders, 0002_tracking, 0003_admin and **0004_delivery** in order, records SHA-256
checksums and uses a transaction/advisory lock. It skips matching applied files and
rejects checksum mismatches. Never edit migration history to bypass a failure;
inspect privately, restore if necessary, and add a reviewed forward migration.
Do not run seed scripts or `npm test` against this database. Do not put migrations
in a Vercel build command: concurrent deployments must not own schema changes.

### Restricted application role and RLS

Provision a separate login role (for example `preview_app`) with NOSUPERUSER,
NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOBYPASSRLS, no table ownership and no
membership in elevated roles. Set its strong password interactively using psql
`\password preview_app`. Keep the migration/owner credential off Vercel.

Grant CONNECT on the target database and USAGE on public, then only these operations:

| Tables | App grants |
| --- | --- |
| products, orders | SELECT, UPDATE; INSERT additionally on orders |
| audit_logs | SELECT, INSERT only |
| admin_users | SELECT, UPDATE only; bootstrap uses separate operator role |
| admin_sessions | SELECT, INSERT, UPDATE, DELETE |
| admin_recovery_codes | SELECT, UPDATE only; bootstrap inserts |
| order_rate_events | SELECT, INSERT, DELETE; USAGE on its identity sequence |
| tracking_code_limits | SELECT, INSERT, UPDATE |
| delivery_codes, delivery_email_attempts | SELECT, INSERT, UPDATE |

Do not grant TRUNCATE, schema CREATE, migration-ledger access, broad future-table
default grants, or audit UPDATE/DELETE. Bootstrap needs INSERT on admin_users,
admin_recovery_codes and audit_logs; use a temporary restricted bootstrap role or
trusted migration operator, then revoke that temporary access.

Migrations enable RLS but create **no runtime policies**. A NOBYPASSRLS role will
therefore be denied until explicit policies are provisioned. For this backend-owned
model, create SELECT/INSERT/UPDATE/DELETE policies only for preview_app and only for
the operations above (USING true / WITH CHECK true as appropriate). For example:

```sql
CREATE POLICY preview_orders_read ON public.orders
  FOR SELECT TO preview_app USING (true);
CREATE POLICY preview_orders_insert ON public.orders
  FOR INSERT TO preview_app WITH CHECK (true);
CREATE POLICY preview_orders_update ON public.orders
  FOR UPDATE TO preview_app USING (true) WITH CHECK (true);
```

These policies authorize the trusted backend across rows; application auth/CSRF
still enforces per-request access. They are not customer isolation policies. Never
create these policies TO PUBLIC, anon or authenticated. Revoke unnecessary grants
from those roles and disable/exclude these tables from the Data API when unused.
Verify the actual app role can perform the smoke flow but cannot truncate, alter
schema, edit audit history, or use the migration ledger; verify anonymous Data API
access cannot read any app table. Keep policy/grant SQL reviewed and versioned as a
separate provisioning change before deployment. No remote grants are executed by
this guide. [RLS reference](https://supabase.com/docs/guides/database/postgres/row-level-security).

## First administrator

On a trusted local Node 24 terminal, load the remote direct/session DATABASE_URL
for the operator/bootstrap role and the exact preview ADMIN_SECRET_KEY using a
secret manager or hidden prompts. Confirm the target project again. Run:

```bash
node scripts/create-admin.mjs
```

It accepts no arguments and requires a real interactive terminal. Enter email and
a unique password at its hidden password/confirmation prompts. Save the one-time
TOTP enrollment URI in your authenticator and eight recovery codes in an encrypted
password manager with an offline backup separate from the authenticator. Do not
record terminal output, redirect it to logs, or capture screenshots. Clear terminal
scrollback securely and unset DATABASE_URL and ADMIN_SECRET_KEY afterward. Test
password plus TOTP; test one recovery code once and mark that code consumed.
There is no public signup. Do not create an admin during the build.

## Proxy and Turnstile verification

Set TRUSTED_PROXY_MODE=vercel. Current code accepts only one valid IP from
`x-forwarded-for`; comma-separated chains and absent/invalid headers fail closed.
Vercel documents overwriting this header at its ingress. Check the exact deployment
path, including any CDN in front, against [Vercel request headers](https://vercel.com/docs/headers/request-headers).

Using an authorized protected-preview browser/client, submit synthetic requests
from one network, repeat with a forged `x-forwarded-for` value, and then use a second
network. Check stored rate-limit/audit HMAC identities: the forged header must not
change the first network's identity; the second network should differ. Confirm rate
limits persist across requests/instances. Do not log raw IPs or secrets, expose a
public header-debug endpoint, or relax parsing to make a proxy mismatch work. Stop
rollout if spoofing works or legitimate traffic is rejected; correct and review the
trusted ingress first.

Create production Turnstile keys for the preview widget and add the exact controlled
preview hostname(s), without scheme/path. Do not use unrestricted hostnames or
broad shared vercel.app authorization. Keep SITE_ORIGIN/ALLOWED_ORIGINS consistent;
verify returned hostname and actions `order`, `track`, `admin`. A production build
rejects test keys, and Vercel explicitly forbids LOCAL_ORDER_SMOKE.
[Cloudflare hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).

## Email preparation

Keep EMAIL_MODE=log-safe with no RESEND_API_KEY during ordinary preview smoke.
For separately authorized real-send testing, add a domain/subdomain you own to
Resend and publish the exact SPF and DKIM records it provides (including requested
return-path records). Avoid duplicate SPF records on one hostname. Wait for domain
verification, disable provider open/click tracking, and set EMAIL_FROM to a plain
address in that domain. Create a domain-scoped sending key stored only server-side.
[Resend domains](https://resend.com/docs/dashboard/domains/introduction).

Publish a DMARC TXT record under the appropriate `_dmarc` domain with a monitored
report destination. Start with monitoring if other legitimate senders are not yet
validated; inspect alignment reports before tightening to quarantine/reject. Verify
SPF, DKIM and DMARC in a controlled recipient's message headers before live sends.
[Resend DMARC](https://resend.com/docs/dashboard/domains/dmarc).

## Post-deploy smoke checklist (future operator action)

- Confirm unauthenticated Vercel visitors cannot reach pages or APIs, including
  alternate deployment URLs. Use only authorized team access for remaining checks.
- Check HTTPS and HSTS; admin responses have no-store, noindex, no-referrer and
  X-Frame-Options DENY. CSP uses fresh nonces and frame-ancestors none. Turnstile
  renders and verifies without CSP errors; do not add unsafe-inline to fix failures.
- Login requires password plus TOTP, rotates session on 2FA, and denies half
  sessions. Inspect `__Host-admin`: Secure, HttpOnly, SameSite=Strict, Path=/ and no
  Domain attribute. Missing/wrong CSRF and untrusted Origin must fail protected POSTs.
- Unknown admin prefixes, pages and API paths return 404 after passing Vercel's
  protection layer. Logout deletes the session; old cookies no longer work.
- With synthetic product/order details, verify authoritative prices, duplicate
  TrxID rejection and limits. Do not transfer money. Verify/reject only synthetic
  claims; check illegal transitions return 409 and successful actions have audit rows.
- Upload synthetic codes, inspect counts/stock, assign twice without duplication,
  reveal with no-store/audit, preview email in log-safe mode, and mark delivered.
  Verify void/reassignment and the three-attempt email limit. Inspect logs privately
  for leakage without copying codes or credentials into a report.
- Tracking requires order code plus correct suffix and Turnstile, shows delivered
  and masked destination, and never returns a voucher. Wrong lookup credentials
  fail generically. WhatsApp URL contains no voucher; copy requires a deliberate click.
- Check app-role DB permissions/RLS, header spoof resistance, and connection usage.
  Record results with statuses/counts only. Remove synthetic fixtures through an
  operator-reviewed cleanup that preserves required audit evidence.

## Backups and key rotation

Store each key with its environment, purpose and version in a restricted encrypted
vault with a separately secured offline backup. Database backups alone cannot
recover encrypted TOTP seeds or vouchers. Rehearse restoration of database plus
matching key versions in isolation; restrict retention and operator access.

The current app has single keys and no key-version/rotation command. Do not merely
replace ADMIN_SECRET_KEY or DELIVERY_CODE_KEY in Vercel. Pause writes and delivery,
take a consistent backup, and prepare/test a separate maintenance tool before any
rotation. Re-encrypt TOTP seeds with the admin AAD; re-encrypt all voucher states with
fresh unique IVs and delivery AAD, updating encryption_iv and every HMAC fingerprint
using the new delivery key. Fingerprint rotation must preserve duplicate detection
and uniqueness. Coordinate DB update and environment redeploy without mixed-key
instances; retain old keys for matching backups. Revoke admin sessions and verify
2FA/decryption after a compromise or rotation. Roll back DB and keys together.

IP_HASH_SECRET rotation needs no ciphertext migration but changes rate-limit and
audit identities. Pause traffic, account for the lost continuity of IP/account limit
buckets, and wait out or otherwise conservatively preserve existing windows before
resuming. Keep historical key versions restricted only as required by the audit
retention policy. Never log keys during validation.

## CI evidence

On 2026-11-05, full-head lookup for
`adfa1915f33e77eab968000177138b7ed709d21d` returned successful Project checks run #34:
https://github.com/ztrace054-x/ecommerce-website/actions/runs/41826613163

`.github/workflows/ci.yml` triggers PRs targeting main. Push triggers cover main and
phase-* (not feat/phase-7-delivery), but this does not suppress PR events. Contents
read permission suffices for checkout and the local checks. The previous empty
lookup used abbreviated SHAs and was not evidence of absent CI. No workflow or
permission change is needed, and no check was weakened.
