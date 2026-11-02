# minimatch advisory — 2026-11-02

Main at be795e0 reported GHSA-g3hv-75wg-m249 (globparts amplification denial
of service), affecting minimatch below 11.0.1. All installed paths are dev-only:

- eslint -> minimatch
- eslint -> @eslint/config-array -> minimatch
- typescript-eslint -> @typescript-eslint/typescript-estree -> minimatch

The audit's 11 affected package entries are propagated through this lint-tool
chain; there is no runtime minimatch dependency. No eslint-config-next is installed.

Plain npm audit fix updated @eslint-community/eslint-utils from 4.9.1 to 4.10.1
within its existing range, but left 11 findings. The latest stable ESLint 10.14.0
and typescript-eslint 8.72.1 remained affected. @eslint/js 10.0.1 and
@eslint/config-array 0.23.5 were already latest. These releases support the project's
Node 24, TypeScript 6.0.3 and ESLint flat configuration; Next.js remains 16.4.3.

Scoped npm overrides pin minimatch 11.0.1 only under eslint,
@eslint/config-array and @typescript-eslint/typescript-estree. The patched version
supports Node 24 and supplies both CommonJS and ESM exports. Remove these overrides
when upstream dependency ranges include the patched release. No forced audit fix,
ESLint downgrade, lint configuration change or audit suppression was used.

Verification, in order: npm ci; npm run lint; npm run typecheck; npm test
(37 passed, zero failed/skipped); npm run build; npm audit (zero vulnerabilities).
The environment guard also passed. Tests used only local PostgreSQL 17 at
127.0.0.1:55432, database ecommerce_test, with migrations 0001 and 0002 applied.
