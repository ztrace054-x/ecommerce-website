The original Phase 2 tables and migrations are retained. `0002_marketplace.sql`
adds the web quote/claim/tracking/admin RPCs and restricted grants. Apply the
Drizzle journal with `npm run db:migrate`; never replace earlier migrations.
The original non-destructive seed contains two active, labelled sample services
and two inactive A/B examples. Approval flags and missing payment configuration
keep the review checkout closed. See docs/architecture-continuation.md and
docs/deployment.md; the private review has no real PostgreSQL/Supabase connection.
