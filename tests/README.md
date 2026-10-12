# Test strategy

Phase 1 has UI-only customer pages and the foundation's security boundaries for
configuration and Git-visible environment files. Run `npm test` on Node.js 24 to
check those boundaries with synthetic values and disposable local Git fixtures.
Tests make no network requests, use no real keys, and clean up their fixtures.

The tests cover missing/blank server values, lazy reads, unsupported variable
names, frozen public configuration, empty templates, force-added private files,
unexpected public keys, missing ignore rules, duplicate or missing placeholders,
and error-output privacy. The server-module tests use Node's `react-server`
package condition so the Next.js `server-only` marker can load in a server test
process. The application's Client Component boundary remains unchanged.

`npm run check` includes these tests, the environment repository check, lint,
strict types, and production build. `npm run audit:dependencies` separately checks
published advisories. Local HTTP smoke checks verify the minimal runtime.

Do not add tests that merely repeat the placeholder's JSX or assert that a folder
exists. Add meaningful feature tests alongside the feature in an approved phase.

Future test groups:

| Group | Examples |
| --- | --- |
| Unit | BDT precision, independent input rules, allowed status transitions, encryption tamper rejection |
| Database integration | Unique TrxIDs/order codes, concurrent claims, transaction rollback, private access |
| Route/security | Authorization, CSRF/origin validation, rate limits, Turnstile failures, request size limits |
| End-to-end | Server quote, valid submission, administrator verification, permitted delivery, rejection/refund policy |

Use synthetic identities and payments, an isolated local database, and mocked
email/bot services. Tests must not connect real Supabase, Resend, bKash, or AI
platform accounts, and must not send WhatsApp messages.

Important later attacks to cover: edited frontend prices, state/role injection,
concurrent duplicate claims, order-code guessing, guessed customer-access tokens,
repeated delivery requests, voucher exposure, and unavailable external services.

Before a release, review the actual routes and data paths as well as test output.
A green build and audit do not establish that a payment or authentication flow
is safe. Phase 1 never claims to have implemented those protections.

Phase 1 verification also checks routes, navigation, native FAQ interaction,
responsive widths, and the checkout's no-submission/no-storage boundary with
synthetic data. See `docs/phase-1-verification.md` for actual evidence and
`docs/local-development.md` for owner checks. Browser tooling used for local
review is separate from application dependencies; `npm test` still contains
eleven configuration security tests, not a claimed payment feature suite.
