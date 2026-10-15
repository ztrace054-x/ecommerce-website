# Architecture

Current scope: Phase 2 foundation. Publishing, deployment and Vercel connection
are paused. See [the Phase 2 audit](phase-2-foundation-audit.md) for current
requirement mapping, additive migration decisions and verification.

The current architecture is documented in [architecture-continuation.md](architecture-continuation.md).
The original Next.js application is retained and now includes PostgreSQL-backed
quotes, claims, private tracking, provider authentication and admin operations.
Reviewed migrations/RPCs are authoritative for transactional rules and access grants.
The private review deployment keeps payment collection closed until configured.

See [repository-audit.md](repository-audit.md) for the pre-continuation state and
[deployment.md](deployment.md) for real-service activation and remaining checks.
The [14 October report](progress-2026-10-14.md) maps the requested database/API
responsibilities to this implementation and records the latest frontend work.
