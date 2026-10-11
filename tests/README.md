# Test strategy

Phase 0 has no business features to test. Its validation uses the environment
repository check, lint, strict TypeScript, production build, dependency audit,
and local HTTP smoke checks. `npm run check` performs the repeatable foundation
checks; `npm run audit:dependencies` separately checks current advisories.

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
is safe. Phase 0 never claims to have implemented those protections.
