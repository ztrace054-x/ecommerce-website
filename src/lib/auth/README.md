# Administrator authentication preparation

An authentication provider and session design have not been selected. Ask the
owner before implementing them. No login page, middleware guard, public admin
route, or session implementation exists in Phase 0.

Use a reviewed authentication system. Authorize every protected server action and
route handler against the authenticated administrator's role. Plan session
expiry/revocation, secure cookies, CSRF/origin checks, and isolated tests.

ADMIN_SECRET is a reserved server-side configuration name, not a password,
public API token, or login bypass. Never implement `?admin=true`, hardcoded demo
credentials, browser-only access checks, or missing-configuration authentication
fallbacks. Never request passwords for customers' third-party AI accounts.
