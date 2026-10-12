# Security scope and preparation

## What Phase 0 provides

- Strict TypeScript and explicit application/database/authentication boundaries.
- A blank environment template and ignored local environment/key files.
- A lazy server-only configuration accessor with an explicit name allowlist.
  Missing or blank configuration throws an error; values are never printed.
- Public configuration contains only the future Turnstile site key. It may be
  absent in Phase 0 because there is no protected submission feature yet.
- Basic `nosniff`, frame denial, referrer, and browser-permission headers.
- Exact direct dependency versions, an integrity-bearing lockfile, and audits.
- A GitHub check workflow with pinned action commits, read-only repository
  permissions, no persisted checkout credentials, and no deployment steps.

`requireServerEnv` does not validate a database URL, encryption-key encoding,
key strength, or service-specific configuration. Those checks belong in the
reviewed integration added later. Do not interpret a nonempty string as a safe
or working integration. The application does not call this accessor in Phase 0.

The `server-only` import causes a Next.js build error if a client dependency
graph imports that module. It does not protect a secret intentionally passed
as a client prop, returned by an API, or printed in a log. Review data boundaries
as well as imports.

## Repository safeguards

Run `npm run check:env` before committing. It checks both tracked and unignored
files, rejects private environment files even if force-added, checks the ignore
rules, and requires empty values and expected names in `.env.example`.

This check is not a general secret scanner. It cannot detect every hardcoded
token, a plaintext voucher placed in another file, or a previously leaked secret
in Git history. Review every staged change. `.gitignore` cannot remove a file
that has already been committed.

Never create or store real credentials during these local phases. Later approved secrets belong
only in ignored local configuration or the agreed server secret store. Keep
database access keys, Turnstile secrets, Resend keys, encryption keys, and any
future session-signing secret out of public configuration and Git.

## Dependencies

Use `npm ci` to reproduce the lockfile. `npm run audit:dependencies` fails for
known advisories rated moderate or higher, including development dependencies.
An audit result is a point-in-time package check, not a complete application
security assessment. Investigate advisories and review upgrades deliberately.

The lint setup uses maintained ESLint 10 with compatible TypeScript tooling.
The optional Next.js lint plugin is not installed: its current glob dependency
is affected by [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Framework-specific lint rules can be added when a compatible audited release is
available. Next.js still generates route types and type-checks the production
build. No audit exclusions or forced dependency downgrades are configured. Phase 2
found esbuild <=0.24.2 under Drizzle Kit's deprecated loader and pins the compatible
patched esbuild 0.25.12 through a scoped override. Migration generation/checking
and the application checks were rerun; audit reports zero known vulnerabilities.
See [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
Recheck this override when the upstream loader dependency changes.

References:

- [Next.js environment-variable boundaries](https://nextjs.org/docs/app/guides/environment-variables)
- [Next.js server and client components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js ESLint plugin configuration](https://nextjs.org/docs/app/api-reference/config/eslint)
- [ESLint supported versions](https://eslint.org/version-support/)
- [TypeScript ESLint setup](https://typescript-eslint.io/getting-started/)

## Controls still required before real use

### Upstream security review

The earlier Phase 0 record cited a notice about a security update planned for
14 October 2026. On 12 October, the notice could not be retrieved and its details
could not be independently reverified from current primary sources. Do not
treat its date or severity details as currently confirmed findings or a release
guarantee. The historical verification record is retained with this limitation.

Before deployment, review [official Next.js security advisories](https://github.com/vercel/next.js/security/advisories),
apply patches required for the installed versions, and rerun checks. The final
Phase 1 npm audit reported zero known vulnerabilities on 12 October, but that
does not establish the absence of unpublished vulnerabilities. Local frontend
work does not authorize a public launch.

### Current frontend boundaries

The customer pages use labelled sample services/prices only. Checkout has no
HTML form, input names, submit control, network call, order code, transaction
claim, recipient number, or storage. Its one button checks inputs locally only.
The optional phone field and native validity feedback are not server security
controls; reviewed server validation belongs to Phase 3.

Only validated active database product UUIDs can select a product. Price query parameters are ignored,
and untrusted query values are never rendered as HTML. React escapes displayed
text; no raw HTML injection or remote content rendering is used.

Policy pages are drafts for owner review, not guarantees about legal compliance,
refund deadlines, or business eligibility. No actual WhatsApp destination or
support email is configured. The floating icon navigates to Contact, and real
order links are deferred. Do not add guessed contact or payment details.

### Implemented Phase 2 controls

- Strict server Zod schemas reject extra price/status/role fields and normalize
  contact/TrxID fields. These internal operations are not exposed HTTP APIs.
- PostgreSQL UNIQUE constraints and canonical-format checks protect order codes
  and TrxIDs under concurrency. Assigned TrxIDs cannot be changed or released.
- A transaction locks the active product. A DB trigger independently supplies
  the price and freezes order identity/product/code/created time/price afterward.
- Foreign keys, integer prices, state/timestamp checks, indexes and encrypted
  storage-format guards prevent inconsistent records. They do not verify payment.
- RLS is enabled with no public policies. Non-owner roles with table grants
  cannot read/insert rows. Catalog readers project only active public fields.
- Database modules are server-only, connections lazy, queries parameterized,
  errors redacted and remote TLS certificate/hostname verification required.
  Only loopback development may use plaintext transport.
- AES-256-GCM uses a random 12-byte IV, 16-byte tag and authenticated record/purpose
  context. Canonical 32-byte base64 keys are required; wrong keys, tampering and
  context swapping fail closed. No real voucher/TOTP data or keys are stored.
- Terminal provisioning accepts no credential arguments/piped input, hides both
  password entries, validates confirmation, stores a salted memory-hard scrypt
  hash and refuses duplicate email without overwriting it. No admin is seeded.
- Tests use only an explicit disposable loopback `_test` database, never the app
  URL. Full CI uses fresh native PostgreSQL 17 through the documented Compose setup.

### Future application controls

Order/payment claims have no endpoint yet. Phase 3 must implement request/body
limits, durable atomic rate limits, trusted-IP rules and real server Turnstile
verification before using the internal order function. Confirm actual bKash method
and TrxID format; a formatted or unique ID is never proof of payment. Correction
and refund policies must not permit silent reuse of retained transaction IDs.

Administrator login/sessions, 2FA enrollment/verification, secure cookies,
CSRF/origin checks, lockouts, authorization and allowed status transition graph
belong to Phase 5. A provisioned row with null TOTP cannot receive a session.
Every verification, delivery and refund must require an authenticated authorized
administrator and the actual manual bKash check. State CHECKs alone do not do this.
Private customer tracking and delivery access are also required later; knowing
an eight-character display code must not expose contact data or vouchers.

Before live use, review least-privilege runtime/migration roles, actual Supabase
TLS/pooling, key backup/rotation, data retention/backups, public policies, CSP,
HTTPS/HSTS and official package advisories. RLS does not protect a leaked owner
credential. Local Compose credentials are private/local-only, CI credentials are
public disposable fixtures, and neither is a production account. Do not deploy,
accept real customers/payments or publish products yet.

## If a secret is accidentally exposed later

Revoke or rotate it immediately at the relevant provider, then review affected
access. Removing the current file does not undo exposure or remove Git history.
Agree on history cleanup and recovery actions separately; never rewrite shared
history automatically. Do not post the exposed value in an issue or message.
