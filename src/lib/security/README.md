# Security utilities

Phase 2 implementations live in src/server/security/: crypto-secure order codes
with database collision retry, AES-256-GCM with fresh IV/tag and record context,
and salted scrypt password hashing. Strict Zod validators are in src/server.
They are tested; no real keys, passwords or voucher codes are seeded.

Phase 3 must implement durable atomic limits and real server Turnstile verification
before exposing order/TrxID submission. Phase 5 must implement real auth/2FA and
authorized state changes before verification/delivery. No always-successful
security checks or process-local production limit shortcuts are permitted.
See PLAN.md and docs/security.md for future requirements and tested boundaries.
