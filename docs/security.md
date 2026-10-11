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

Never create or store real credentials for Phase 0. Later approved secrets belong
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
build. No audit exclusions or forced dependency downgrades are configured.

References:

- [Next.js environment-variable boundaries](https://nextjs.org/docs/app/guides/environment-variables)
- [Next.js server and client components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js ESLint plugin configuration](https://nextjs.org/docs/app/api-reference/config/eslint)
- [ESLint supported versions](https://eslint.org/version-support/)
- [TypeScript ESLint setup](https://typescript-eslint.io/getting-started/)

## Controls still required before real use

### Upcoming upstream security update

The Next.js maintainers announced on 8 October 2026 that a security update is
planned for **14 October 2026**, covering two Critical and one High severity
vulnerabilities in upstream dependencies. The notice does not yet give full
affected-version or impact details. Do not infer this minimal app's precise
exposure or production safety from a clean npm audit.

Review the released advisories, apply the appropriate patch when available, and
rerun checks before any deployment. Local Phase 0 work does not authorize launch.

Source: [Official Next.js notice](https://nextjs.org/blog/upcoming-nextjs-security-update-october-2026).

### Future application controls

Authentication, administrator authorization, CSRF protection, durable rate
limiting, Turnstile verification, database access policies, payment-claim
validation, voucher encryption, private delivery access, and service-specific
environment validation do not exist yet. Their requirements are in PLAN.md.

A complete Content Security Policy and HTTPS/HSTS also remain future work.
The basic headers do not replace those controls. Do not deploy this foundation,
accept real customer information, collect payments, or publish products from it.

## If a secret is accidentally exposed later

Revoke or rotate it immediately at the relevant provider, then review affected
access. Removing the current file does not undo exposure or remove Git history.
Agree on history cleanup and recovery actions separately; never rewrite shared
history automatically. Do not post the exposed value in an issue or message.
