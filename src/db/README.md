# Database

Typed PostgreSQL schema is in schema.ts; generated snapshots and reviewed SQL
are in migrations/. Use npm run db:migrate, not runtime string-built SQL.
The tables use foreign keys, integer BDT prices, UNIQUE codes/TrxIDs, state checks
and RLS with no public policies. Static triggers freeze quotes/assigned TrxIDs.

Application data access belongs in src/server/. See docs/database.md for every
table, commands, privacy boundaries and future Supabase connection preparation.
No live Supabase database or real records are configured.
