# Repository guidance

Current owner instruction (14 October 2026): audit and complete the Phase 2
database/backend foundation, preserve the existing frontend and earlier backend
work, test and commit progress. Do not deploy, publish, connect Vercel, connect
live services, or extend admin UI/payment integrations. This supersedes the
historical deployment authorization below. GitHub source commits and CI checks
are authorized; neither the workflow nor this task publishes a website.

Read README.md and PLAN.md before changes. Continue the existing project; never
replace it with a starter. The owner's 13 October 2026 request authorizes the
repository audit, backend/admin/customer development, testing, documentation and
private review deployment. Earlier Phase 1-only boundaries are historical.

Work within the latest authorized scope. Explain major architecture decisions,
finish the necessary work, test each major feature and report actual evidence.
Do not stop for routine implementation choices. Ask only for genuinely missing
business details or external configuration and continue independent work.

Keep secrets out of Git and browser code. Never use ADMIN_SECRET as a password,
add a default admin, collect third-party passwords, PINs or OTPs, or treat a TrxID
as proof of payment. Keep samples inactive/labelled and checkout closed until
actual required configuration and policy/catalog approvals exist.

Use a continuation phase branch and keep history intact. Update PLAN.md progress
and verification documents. Do not merge without instructions. Review deployment
is authorized; preserve its private audience. A review URL is not a commercial
launch or evidence that actual Supabase/bKash services are configured.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
