# Repository guidance

Read `README.md` and `PLAN.md` before changes. `PLAN.md` is the project source of
truth. Follow the phase explicitly authorized by the owner; this foundation task
authorizes Phase 0 only. Do not start later phases, merge into `main`, deploy, or
configure live services without instructions. Never commit real secrets, request
customer passwords, or add payment/authentication shortcuts. Report actual checks.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
