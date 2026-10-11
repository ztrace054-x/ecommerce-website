# Database preparation

PostgreSQL with Drizzle is the planned persistence layer. Supabase free-tier
access is deferred until real-service connection is explicitly approved.

Phase 1 will resolve the schema questions in PLAN.md, then add schema definitions,
reviewed migrations, and synthetic local fixtures. No schema, database client,
live connection, migrations, or real records exist in Phase 0.

Keep database access server-only, queries parameterized, access roles restricted,
and duplicate/state constraints enforced in the database. Customer and voucher
data must not be exposed by public Supabase access. An empty DATABASE_URL must
never select a shared production database or an insecure fallback.
