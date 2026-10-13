# Architecture

The current architecture is documented in [architecture-continuation.md](architecture-continuation.md).
The original Next.js application is retained and now includes PostgreSQL-backed
quotes, claims, private tracking, provider authentication and admin operations.
Reviewed migrations/RPCs are authoritative for transactional rules and access grants.
The private review deployment keeps payment collection closed until configured.

See [repository-audit.md](repository-audit.md) for the pre-continuation state and
[deployment.md](deployment.md) for real-service activation and remaining checks.
