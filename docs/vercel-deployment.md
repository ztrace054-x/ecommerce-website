# Vercel deployment preparation and production verification

**Deployment is paused.** The owner's later Phase 2 request explicitly forbids
Vercel connection and publishing. Retain these steps for a later authorized
release; do not execute them as part of the current foundation work.

Date: 14 October 2026. Continue the existing `phase-3-marketplace` branch.
Audited starting commit: `24d745e860e5a1dc3900754c3e97f4eb0888acb7`.
`main` still contains the older Phase 1 source; draft PR #1 is unmerged.
No customer UI, backend handler, database migration or authentication code is
replaced or extended in this deployment-preparation task.

## Current online status

https://ai-seba-marketplace.cwrtravel1102.chatgpt.site

The existing owner-private Site remains online. Its current native deployment
status was rechecked as `succeeded`, with version 3 and no failure message.
Sign in with the owner's ChatGPT account to review it. This is the existing Sites
deployment, not a newly created Vercel deployment. Its payment collection is closed.

Direct Vercel deployment is not available in this session: the Vercel plugin was
discovered but is not installed/connected, the checkout has no `.vercel/project.json`,
and no Vercel token/project/organization variables are supplied. The user can
connect Vercel or perform the exact manual workflow below. No account token or
password should be pasted into chat or committed.

## Build configuration

The committed `vercel.json` uses the standard Next.js build from this same app.
The existing dual Next.js/Worker build remains available for other hosting.

| Vercel setting | Value |
| --- | --- |
| Repository | `ztrace054-x/ecommerce-website` |
| Source branch for this review | `phase-3-marketplace` |
| Framework Preset | Next.js (`nextjs`) |
| Root Directory | Repository root (`./`) |
| Node.js Version | `24.x`, already declared in `package.json` |
| Install Command | `npm ci` |
| Build Command | `npm run build:next` |
| Output Directory | Leave the Next.js default; no override |
| Deployment Protection | All Deployments + Vercel Authentication for owner review |

Vercel supports Node 24 and App Router/SSR. The config overrides the generic
package build command so Vercel does not also compile the Sites Worker. It adds
no rewrites, static export, hardcoded host, credentials or migration step.
Vercel's Next.js integration handles functions and assets; `npm start` is for
local Node production checks, not a dashboard Start Command.

## Manual deployment from the correct branch

Use a Node 24 workstation and your own authenticated GitHub/Vercel accounts.
Run these commands inside the existing checkout. Clone the same repository
only if it is not already on your computer.

```bash
git fetch origin
git switch phase-3-marketplace
git pull --ff-only origin phase-3-marketplace
npm ci
npm run lint
npm run build:next
npm run smoke:production
npx vercel@latest login
npx vercel@latest link
```

During `link`, select your account and the existing Vercel project for this
repository if one exists. If it has never been registered with Vercel, create
its hosting entry using the same code. Keep the project root at `./` and the
settings above. This does not create or replace a GitHub repository.

Before publishing, open the linked Vercel project dashboard:

1. Under **Settings → Build and Deployment**, confirm Next.js, Node 24 and the
   install/build values above. Keep Output Directory on its default.
2. Under **Settings → Environment Variables**, set the three closed-review
   flags below in both Preview and Production. Add no real provider credentials.
3. Under **Settings → Deployment Protection**, select **All Deployments** and
   **Vercel Authentication** to retain a private review audience.
4. If Git deployments are connected, confirm the linked repository. Open
   **Settings → Environments → Production → Branch Tracking**, set
   `phase-3-marketplace`, and Save. This branch selection does not merge the PR.
5. From the checkout, publish the closed review:

```bash
npx vercel@latest --prod
```

Wait for Vercel to report Ready and use the exact URL it returns. The first CLI
deployment of a new hosting project is production even without `--prod`; configure
the privacy and closed-review flags before that first deployment. Never use
`--public`, which concerns exposing source code rather than enabling checkout.

For dashboard-only deployment, import this existing GitHub repository with
**Add New → Project**. The initial import defaults to `main`; it is older and
does not contain `build:next`. Use `npx next build` for that initial import if the
interface does not allow selecting the advanced branch. After project creation,
set Branch Tracking as above, then **Deployments → Create Deployment** with
`phase-3-marketplace`. Its committed `vercel.json` applies `npm run build:next`.
Verify the deployment's source branch/commit before accepting its URL as current.

Vercel Hobby is restricted to non-commercial personal use. Check an eligible
plan before operating this as a commercial marketplace; this task does not
start billing or select a paid plan for the owner.

## Environment variables

The closed frontend review needs no service secrets. Keep `.env.example` blank.

| Closed-review setting | Value | Scope |
| --- | --- | --- |
| `CHECKOUT_ENABLED` | `false` | Preview and Production |
| `CATALOG_APPROVED` | `false` | Preview and Production |
| `POLICIES_APPROVED` | `false` | Preview and Production |

`APP_URL` is optional while checkout is closed. If supplied, use the exact HTTPS
origin that visitors will use, without paths or query parameters. Do not use a
guessed domain. Browser requests already use relative same-origin URLs.

These existing requirements apply only to a later authorized live activation:

| Variable/group | Responsibility | Current action |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server database/auth endpoint and secret service key | Leave unset for this frontend review |
| `APP_URL` | Exact trusted HTTPS origin | Confirm before enabling protected writes |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Public widget key and private server verification key | Leave unset; actual widget/domain setup is deferred |
| `BKASH_RECIPIENT_NUMBER`, `BKASH_PAYMENT_METHOD` | Confirmed recipient and `payment`/`send_money` method | Leave unset; no live payments |
| `SUPPORT_EMAIL`, `SUPPORT_WHATSAPP_NUMBER` | Actual owner-approved support contacts | Optional; do not invent destinations |
| `TRUSTED_CLIENT_IP_HEADER` | Host-reviewed, overwritten client-IP header | Leave unset until the forwarding boundary is reviewed |
| Approval/enabling flags above | Assert completed business/policy review | Keep `false` |

`DATABASE_URL`, `MIGRATION_DATABASE_URL`, `TEST_DATABASE_URL` and `POSTGRES_PASSWORD`
are for the existing native database tools/tests; they are unnecessary for this
review deployment. `RESEND_API_KEY`, `ADMIN_SECRET` and `ENCRYPTION_KEY` are not
required by the closed frontend. Do not generate or configure them here.
No secret may receive a `NEXT_PUBLIC_` prefix. Environment changes apply to new
deployments: redeploy after changing a value in the correct Vercel environment.

## Production checks performed

Installed locked dependencies were already present; reinstalling was unnecessary.

| Check | Result |
| --- | --- |
| Current local/remote branch | Matched; clean starting checkout |
| `npm run lint`, `npm run check:env` | Passed |
| `npm run build` | Passed: Next.js and existing Worker adapter |
| `npm run typecheck` | Passed, including the production smoke script |
| `npm run smoke:production` | Passed: 19 page routes, 13 JS/CSS assets and local Bangla font |
| Route/security behavior | Passed: invalid/repeated selectors, ignored query price, security headers, admin denial and closed claim/quote endpoints |
| Server output | No application exception found in production smoke |
| Responsive source review | Existing wrapping navigation and mobile/tablet/desktop CSS reviewed |
| Rendered layout/browser console | Unverified: supported control-browser is unavailable in this managed environment |
| Existing online deployment | Rechecked `succeeded`; owner-private Site version 3 |
| Direct Vercel deployment | Blocked on account connection; no Vercel URL is invented |

The smoke starts the real `next start` production server on loopback port 3000,
checks HTTP behavior and assets, then stops it. It overrides service values only
inside its child process so ignored environment files cannot connect a real
customer database. It changes no files or provider configuration. Stop another
port-3000 server before running it. A passing HTTP check does not prove browser
hydration, JavaScript interaction, responsive pixel layout or real provider behavior.

## Final deployment checklist

- [ ] Vercel account connected and correct hosting project selected.
- [ ] Source branch is `phase-3-marketplace`; latest preparation commit is used.
- [ ] Next.js/Node 24/build/install/output settings match the table.
- [ ] Private review protection is configured before first publication.
- [ ] Three review flags are `false`; no payment recipient or service secrets added.
- [ ] Build reaches Ready and its literal URL is recorded.
- [ ] Review Home, catalog, four details/checkout selections, policies, FAQ and Contact.
- [ ] Review 320/375/768/1280px layouts, keyboard focus, native FAQ and local form feedback.
- [ ] Inspect browser console/network for hydration errors, missing assets and unintended external calls.
- [ ] Retain closed checkout, draft policies and sample labels during review.

## Completed and remaining work

Phase 1 is complete: homepage, catalog, details, customer fields/summary, policy
drafts, Contact and FAQ. This task adds only deployment configuration, repeatable
production verification and documentation.

The selected branch already contains backend/API, schema/migrations, provider
authentication, an admin dashboard and manual-payment verification code from
earlier work. Their remaining task is actual configuration and staging validation,
not rebuilding them. No new backend implementation is started here. Real-provider
authentication/MFA, database access, native concurrency, bKash business details,
payment/delivery procedures and security hardening remain inactive/unverified.

The existing full dependency audit is still blocked by the unpatched braces
hosting-build-chain advisory; a clean Next.js runtime audit does not remove it.
Keep the review candidate distinct from commercial activation and finish the
security, policy, hosting-eligibility and operational work in `deployment.md`.

## Official references checked on 14 October

- https://vercel.com/docs/frameworks/full-stack/nextjs
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/git
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/deployment-protection
- https://vercel.com/docs/cli/login
- https://vercel.com/docs/cli/link
- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/plans/hobby
