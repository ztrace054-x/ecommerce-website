# Repository guidance

Read `README.md` and `PLAN.md` before changes. `PLAN.md` is the project source of
truth. Follow the phase explicitly authorized by the owner. Phase 0 is approved
and merged; the current task authorizes Phase 1 customer frontend pages only.
The owner's corrected roadmap places database work in Phase 2. Do not start
later phases, merge Phase 1 into `main`, deploy, or configure live services
without instructions. Never commit real secrets, request
customer passwords, or add payment/authentication shortcuts. Report actual checks.

## Working rules for every phase

- Complete the whole authorized phase before reporting back. Small phases are
  boundaries for scope, not permission to leave partially working features.
- Do not ask whether to continue in the middle of a phase. Ask only when a true
  blocker needs the owner's input, account, key, or business permission.
- Make sensible, simple MVP implementation decisions within the approved scope
  and record them in the final report. Do not add unrequested features or weaken
  security to avoid a blocker.
- Finish with a working `npm run dev`, appropriate passing checks, small commits,
  and a pushed phase branch. Do not merge or deploy without authorization.
- Keep the `Progress` section in `PLAN.md` current with **Done**, **Next**, and
  **Known issues** at every phase boundary. If a context/time limit prevents
  completion, record the exact checkpoint, commit and push safe progress, and
  clearly report the incomplete work; never call a checkpoint a finished phase.
- Wait for approval for the next phase after the completed phase's final report.

## Phase 1 boundaries

- Use one mock product file for the Home, Product/Plan, and Checkout pages.
- Use simple Bangla, a mobile-first layout, and the requested policy/FAQ pages.
- Checkout is UI only: no orders, payments, transaction IDs, credentials, or
  personal-data submissions. Do not persist form values in browser storage.
- Display that products/prices are samples and ordering is not open. Do not
  invent subscriptions, approved platform resale rights, or contact details.
- The floating WhatsApp icon may link to Contact while the real number is absent.
  Real `wa.me` order links and email templates belong to Phase 6.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
