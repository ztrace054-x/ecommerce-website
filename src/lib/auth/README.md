# Administrator authentication boundary

Phase 2 provides admin_users and terminal-only identity provisioning with a
salted memory-hard scrypt password hash. It creates no session or login access.
The TOTP field is null until actual enrollment. No credentials are seeded.

Login, 2FA, sessions, lockouts, authorization, CSRF/origin checks and management
belong to Phase 5. Deny sessions until verified password AND enrolled valid 2FA;
a row, browser role, shared ADMIN_SECRET, route prefix or layout is not authorization.
Authorize every mutation, use secure cookies and expiry/revocation, and test all
critical rules. Never use hardcoded credentials or missing-config fallbacks.
Never request third-party account passwords from customers.
