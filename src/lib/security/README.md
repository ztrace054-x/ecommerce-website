# Security utilities preparation

Phase 0 prepares the server/public environment boundary and basic response
headers. Input validation, rate limiting, Turnstile verification, and voucher
encryption will be implemented only with their approved features.

Requirements for later utilities:

- Validate inputs on the server with clear size/format limits.
- Use durable, atomic rate limits suitable for multiple application instances.
- Verify Turnstile server-side and reject failure, replay, or missing configuration.
- Confirm bKash format rules before writing TrxID validation.
- Prevent duplicate use with database constraints and transactions.
- Use reviewed authenticated encryption; never invent an encryption scheme.
- Return generic errors and redact secrets, contact details, and voucher codes.

Do not add always-successful checks, process-local production rate limits, or
plaintext voucher helpers as temporary shortcuts. See docs/security.md and PLAN.md.
