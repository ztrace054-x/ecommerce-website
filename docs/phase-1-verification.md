# Phase 1 verification record

Date: 2026-10-11. Runtime: Node.js 24.19.0, npm 11.9.0.
Local browser review: Chromium 153.0.8010.0 with Playwright.

## Scope and source control

The owner's latest Phase 0 GitHub run passed before the approved fast-forward
merge into `main`. Phase 1 branches from that exact foundation. The corrected
roadmap places frontend work in Phase 1 and database work in Phase 2.

Phase 1 adds only the requested customer UI: Home, catalog, four Product/Plan
pages, Checkout preview, Refund/Privacy/Terms/Contact pages, FAQ, and floating
WhatsApp icon. All products/prices are samples in one file. No database,
administrator login, payment API, real contact details, or order tracking was
implemented. No real services, credentials, or customer records were used.

## Completed checks

| Check | Result |
| --- | --- |
| `npm run check:env` | Passed: blank template, ignore rules, no Git-visible private environment files. |
| `npm run lint` | Passed with zero warnings. |
| `npm run typecheck` | Passed with strict TypeScript and generated route types. |
| `npm test` | All eleven configuration security tests passed, none skipped. |
| `npm run check` | Passed: environment, lint, types, tests, and production build. |
| `npm run audit:dependencies` | Passed: zero known vulnerabilities reported. |
| Development and production routes | All thirteen main route instances loaded correctly at 320, 375, 768, and 1280 pixels. |
| Layout/language basics | Bangla document language, one main landmark, one h1, descriptive titles, no horizontal overflow. |
| Navigation | Home → catalog → product details → selected checkout worked. |
| Checkout selection | All four known mock products rendered the requested fields and matching sample price. |
| Unknown/repeated selectors | Unknown product slugs and repeated product query values showed the Bangla not-found page with no inputs. |
| Query price manipulation | Adding `price=1` did not change the selected mock product's price. |
| Input feedback | Missing values and invalid email rejected locally; synthetic valid input worked with WhatsApp left empty. |
| Input resets | Reloading and switching to another product cleared the demo fields. |
| No personal-data submission | No form, input names, or submit controls; synthetic values never appeared in observed requests or the URL. |
| No application storage | Synthetic values were absent from browser local/session storage. |
| JavaScript disabled | Inputs and button could not submit data; native FAQ sections still opened. |
| Keyboard access | Skip link, visible focus, associated field labels, and Enter-operated FAQ sections checked. |
| Floating WhatsApp icon | Opened `/contact#whatsapp`; page explained that no number is configured. |
| External requests | None from the reviewed pages; Bangla font was served locally. |
| Application browser/server errors | None in the successful final development and production checks. |
| Basic response headers | Verified nosniff, frame denial, referrer policy, and permissions policy; no X-Powered-By. |
| Future APIs/admin/tracking | GET and POST to `/api/orders`, `/api/payments`, `/api/auth/login`, `/admin`, and `/track` returned 404. |
| Secret review | No common credential/private-key patterns or unintended environment files found in Git-visible text. |
| Scope review | No route handlers or server actions added; package manifest and lockfile unchanged from the foundation. |
| Visual review | Desktop and mobile Home/Checkout screenshots inspected; Bangla rendered and content stayed within the viewport. |
| Source formatting | `git diff --check` passed. |

The thirteen main route instances were `/`, `/products`, the four product
details, `/checkout`, `/checkout?product=ai-setup`, `/refund`, `/privacy`,
`/terms`, `/contact`, and `/faq`. The remaining checkout selectors and invalid
routes were checked separately. All input was synthetic and no messages were
sent. All review servers and the browser were stopped afterward.

A production check initially returned older generated output even though the
build's HTML had the new Bangla layout. Generated `.next` files were removed and
rebuilt; the full production browser checks then passed against the final UI.
No production runtime failure remains from that check. Generated files are not
committed. The development checks also served the final source successfully.

Browser review tooling was used outside the application and was not added to
`package.json`. GitHub runs the repository's environment/lint/type/test/build
and dependency checks; the local browser review is additional evidence, not a
claimed CI end-to-end test suite. The full reproducible feature suite belongs
to Phase 8. Owner manual checks are in `docs/local-development.md`.

## Limits and follow-up

No real ordering or payment is possible. Sample values are not authoritative
payment prices. Checkout's native validity checks are demo feedback and do not
replace server validation, rate limiting, or Turnstile in Phase 3.

The policy pages are drafts and require owner review before real orders.
WhatsApp number and support email are absent by design; real `wa.me` links are
Phase 6. Database, authentication/2FA, encryption, private order access, and
other production security controls are future work under the corrected plan.

Review the announced Next.js security update planned for 14 October 2026 before
any deployment; the current audit cannot cover unpublished vulnerabilities.
Commercial hosting eligibility also remains unresolved. No merge of Phase 1,
deployment, billing account, or live service connection is authorized here.
