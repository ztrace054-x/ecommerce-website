The original Phase 2 tables and migrations are retained. `0002_marketplace.sql`
adds the web quote/claim/tracking/admin RPCs and restricted grants. Apply the
Drizzle journal with `npm run db:migrate`; never replace earlier migrations.
`0003_phase_2_foundation.sql` adds explicit BDT currency, generated category and
payment status, admin roles and a private security-invoker `payment_claims` view.
Orders remain the single authoritative claim store with unique immutable TrxIDs;
the view joins verification audit records instead of duplicating them. Missing
historical reviewers remain NULL. Only the server runtime can SELECT the view;
it has no write grants. All checks use disposable synthetic databases. No live
database connection/migration or deployment is authorized for this phase.
The original non-destructive seed contains two active, labelled sample services
and two inactive A/B examples. Approval flags and missing payment configuration
keep the review checkout closed. See docs/architecture-continuation.md and
docs/deployment.md; the private review has no real PostgreSQL/Supabase connection.
