# Marketplace continuation verification

The historical 13 October evidence below is retained. Current frontend changes,
repeated checks and limitations are in [14 October progress](progress-2026-10-14.md).

Date: 13 October 2026. Continuation branch: `phase-3-marketplace`.
Baseline main: `b2b490f25b12d66cc1b341c2455747a952cf0338`.
Retained Phase 2 head: `8170a19cedfde1d0a169127c558cb4e05aabdf4b`.

## Verified locally

| Check | Result |
| --- | --- |
| Environment safeguard | Passed; blank template, ignored private files, no committed credentials |
| ESLint / strict TypeScript / diff whitespace | Passed |
| `npm test` | 54 passed, zero failures/skips: 29 retained unit/config + 25 marketplace |
| Retained PostgreSQL and terminal tests | 15 passed, zero failures/skips via disposable PGlite socket servers |
| Drizzle migration journal check | Passed |
| Migration CLI and rerun | Passed; original history plus additive migration |
| Non-destructive seed CLI | First run 4 inserts; second run 0 |
| Development HTTP smoke | Passed on port 3000; database prices, invalid/inactive selectors, protected admin APIs, closed checkout |
| Standard Next.js production build | Passed |
| Sites/Vinext Worker production build | Passed; both use the existing `src/app` |
| Standard Next.js runtime dependency audit | Zero known advisories (`npm audit --omit=dev`) |
| Full dependency audit | Blocking: one unresolved braces advisory, six affected build-chain package entries |

The 69 tests include the quote → claim → private tracking → MFA login → manual
verification → delivery → logout route flow. They check immutable database
prices, duplicate canonical TrxIDs, idempotent/conflicting retries, expired
quotes, status/version checks, audit rollback, role denial, bot context/replay,
request-size/origin protection, durable rate limits, revoked/disabled sessions
and rejection of password-only/wrong-code/unenrolled admin login.

A populated-database upgrade test preserves original orders/TrxIDs/whole-BDT
amounts/internal notes/audit IPs and immutable-price guards. Original migrations
and snapshots remain unchanged; the new migration/snapshot are additive.
The original A/B voucher structures and AES-GCM helper stay intact, with no web
voucher sale or customer credential collection enabled.

## Evidence limits

PGlite is a real PostgreSQL engine with one multiplexed backend. Local promise
tests prove unique constraints/atomic behavior but do not establish independent
native PostgreSQL RPC concurrency or Supabase role/configuration behavior. The
retained GitHub workflow uses native PostgreSQL 17 and Compose. Its current
[PR run 38432431598](https://github.com/ztrace054-x/ecommerce-website/actions/runs/38432431598)
completed for `87c2819868fe8955c55bb697632f4108eb7356d5`. Install, Compose
startup, journal, environment/lint/types/54 tests/dual build, 15 native SQL/terminal
regressions, migrations/seed, development HTTP smoke and cleanup all succeeded.
Only the full dependency audit failed; the overall workflow is therefore red.
This is current evidence, separate from the historical Phase 2 run. Native
multi-connection testing of the new web RPCs and actual Supabase staging remain
activation checks; the native original TrxID regressions do not replace them.

Supabase Auth/PostgREST and Turnstile responses are mocked only in tests. No real
provider account, secret, payment, customer record or delivery was connected.
No supported control-browser is available here; new rendered desktop/mobile
interaction QA is unverified. HTTP smoke/build success does not replace that QA.

`GHSA-vfj7-8cjw-p6xm` affects `braces` 3.0.3 in Vinext's build-plugin/glob chain.
Upstream currently lists no patched version. The six full-audit package entries
share that advisory. The raw audit remains blocking; no ignore list or forced
adapter downgrade hides the finding. A clean standard Next.js runtime audit is
not a security certification of the bundled Worker. Resolve this chain and
review the announced upstream security release before commercial launch.

## Review and activation

The existing private hosting identity is retained. Source synchronization and
deployment returned a successful native result on 13 October 2026:
https://ai-seba-marketplace.cwrtravel1102.chatgpt.site
The original successful deployment is `appgdep_6ace5f82315881919aac8993d995661b`,
version `appgprj_6acdc8c3db4481918fe0423ce597c557~appgver_5e9fa4cee11c8191adeae3106f9b6cbc`.
All 148 GitHub source blobs matched local contents. The synchronized hosting
source commit `03ada5853af9030c5f4bd534f6b05cb7b01bb5bf` has the same tree
`59e9a5570d1202b51a7d53e2152b459055f9cb1b` as the verified GitHub commit.
This completion checkpoint updates documentation only; application inputs for
the tested builds are unchanged. Final deployment status is reported by its
native result after synchronizing the checkpoint.

GitHub history remains based on Phase 2. [Draft review PR #1](https://github.com/ztrace054-x/ecommerce-website/pull/1)
does not merge main. Review deployment has no real database and payments stay
disabled. No rendered browser QA or commercial launch is claimed.

Activation still needs the owner's Supabase configuration and linked/enrolled
admin, Turnstile keys, bKash recipient/method, approved catalog/prices, support
contacts/policies, real-provider/concurrency/mobile QA and security fixes.
Follow `deployment.md`; never paste credentials into chat or commit the template.
