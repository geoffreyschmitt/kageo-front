# Roadmap

Updated 2026-10-21. Edit freely; this is a starting point, not a commitment. Product context (purpose, persona, freemium principles) is in `docs/product.md`.

Legend: **[B]** blocker for real users · **[P]** production readiness · **[Bug]** known defect · items without a tag are improvements.

Phases: **Launch** (family, Christmas 2026) → **Open** (friends and friends of friends, up to a few hundred users) → **Monetise** (freemium, payments) → **Expand** (event suite, vision only).

## 1. Launch — family, Christmas 2026

Success test: the creators' own circle uses Kageo for one real event. No new features beyond this list before launch. Most items need something outside the repo. Ordered, top to bottom:

1. **[P] Separate dev KV from production.** Provision a dedicated development KV database (and one for Vercel's Preview environment), so `.env.local` and the scripts in `scripts/` never touch production data. Prerequisite for the QA below.
2. **[B] Browser QA of the per-wish gift pot and the new account purge.** The gift pot merged 2026-08-29 without live QA (checklist: `docs/superpowers/specs/2026-08-28-gift-pot-per-wish-design.md`, Testing section). The purge and the CSV exports are covered by unit tests against an in-memory KV, never against a real one: run it once on a development database, with a throwaway account that has pledges, comments and a reservation on someone else's list. **Do not point this at production data.**
3. **[B] Send invite emails** via Resend from `api/wishlist/share`. Today the invitee is only recorded in `wishlist:{id}:invitees`; invited people are never notified. Needs a verified Resend sender domain.
4. **[B] Forgot / reset password by email.** Today a user who forgets their password is locked out. Uses the same Resend pipeline as item 3.
5. **[P] Basic rate limiting** on login, register, password reset and the public-link actions (reserve, comment, contribute). Also the first defence against fake/bot reservations (see `docs/product.md`).
6. **Wish import from a URL** via Open Graph / schema.org metadata (name, image, price), best-effort and free; the user can always edit the prefilled fields or fall back to manual entry. Needs SSRF protection (block private/loopback addresses, limit redirects and response size), a short timeout and rate limiting (item 5). Sites that block server fetches simply fall back to manual entry. No Amazon-specific import (see Open).
7. **Wishlist export for people who are not online**: a print-friendly view first, then a CSV of the wishlist (wishes, status, link). Pledge CSV already exists.
8. **Mobile and grandma audit of the public-link flow**: readability, tap targets, no account needed to view, clear sign-up when acting. Fix what it finds.
9. **[P] Production environment check.** Confirm `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Google OAuth redirect URIs and Resend sender-domain verification in the Vercel dashboard (checklist in `docs/runbook.md`).
10. **[P] Resolve the `(verify)` items in `docs/runbook.md`**: Git-deploy behaviour, and whether the KV plan has its own backups.

## 2. Open — beyond the family

Exit criteria from Launch to Open:
- Privacy page reviewed by a lawyer (points in `docs/decisions.md`), plus terms of service; then set `NEXT_PUBLIC_PRIVACY_CONTACT` and `NEXT_PUBLIC_PRIVACY_REVIEWED=1` in Vercel.
- Privacy-friendly analytics to measure the success test.
- Onboarding flow for a first-time organiser.
- Rate limiting and abuse protection (extend the Launch work; add bot protection such as Cloudflare Turnstile on public actions).
- A feedback channel.
- Email verification (invites match by email, so addresses should be proven).

Features and debt:
- **Magic-link sign-in** (passwordless) as a simplicity experiment, alongside Google and password.
- **Amazon-specific wish import** (the generic URL import is in Launch; Amazon often blocks server fetches). *Considered, not planned:* the official Product Advertising API needs an Associates account with qualifying sales and has usage terms; scraping breaks Amazon's terms. Affiliate links conflict with the no-ads principle and would need disclosure.
- **Cover images**: upload + storage (e.g. Vercel Blob); the `coverImage` field already exists on `TWishlist`.
- **Notifications (essential, free)**: pot funded, "you are now organiser of a pot", new suggestion. Never tell the owner about reservations (surprise).
- **"Create your own list" prompt** on public lists, the main growth loop. No marketing before then; word of mouth.
- **Reserve without an account** as an experiment only. Competitors (e.g. iKadoo) offer it, but the owner cannot see reservations, so fake/bot reservations would go unnoticed. If tested: confirmed email (one-click link), not name-only; bot protection; rate limits; show the reserver's name to other guests. Possibly a reservation expiry with a reminder (product decision to make).
- Route, page and race tests cover the app (155 Vitest tests) and `e2e/` runs the main flows in Playwright. Still untested: the client views, and everything against a real KV (see Launch).
- Run `scripts/cleanup-orphans.mjs` (dry run first, after a `kv-backup.mjs backup`) against production to clear orphans left by pre-transaction deletes.
- Not locked: comment lists, and cross-record races such as deleting a wishlist while a pledge lands on one of its wishes. **Deleted accounts keep a valid JWT**: until it expires, routes that only check the session id (e.g. creating a wishlist) would act for a user who no longer exists. Consider checking the account in the `jwt` callback (one KV read per session check).
- **PWA: verify on a deploy.** The build is now `next build --webpack`, so `sw.js` ships. Check a Vercel preview: registration, the offline fallback, the install banner on Android Chrome and iOS Safari, and a Lighthouse PWA audit. Revisit `@serwist/turbopack` if build time becomes a problem.
- Verify the landscape in `docs/product.md` (competitor features are from store listings and vendor pages).

## 3. Monetise

Rule: guests are never paywalled; lists are unlimited; paid features are comfort (see `docs/product.md`).
- **Automatic birthday/Christmas lists** (flagship paid organiser feature): draft a list before a user's birthday or Christmas and remind them. Needs Resend and scheduled jobs (Vercel Cron). **Privacy note:** this needs a privacy review. The stored date of birth is optional and mostly hidden today; using it to trigger lists or reminders changes its purpose, so it must be explicitly opt-in with a clear consent line in the signup and profile flow.
- Freemium tiers and billing. Candidate paid features: cover images/themes, reminders and digests, guest-list/RSVP, print/PDF extras, custom slug, pot creation (undecided).
- **Payment decision for pots**: (A) subscription unlocks pots, no cut; or (B) pots free, percentage on payments. Needs a regulated provider (e.g. Stripe Connect), Kageo never holds funds, legal review first.
- **Revisit storage**: billing and subscriptions need relational data; evaluate moving off KV (it is fine up to a few hundred users).

## 4. Expand — vision only

No commitments; the other modules may never ship. Ideas: guest list/RSVP, shared tasks, budget, schedule, and a **Secret Santa draw** (a possible freemium extension; Elfster and Oh My Wish! already do it). Architecture notes in `docs/architecture.md`.

## Done

- 2026-10-21: product direction defined (purpose, persona, freemium principles, phases); docs updated.
- 2026-10-08 (second pass): server page tests; per-record locks on every wish/wishlist writer (fixes double reservation and lost edits); race tests on a latency-simulating fake KV; Playwright e2e on an in-memory KV; brand app icons (maskable, iOS, favicon); `/privacy` page (fr/en, draft) and footer.
- 2026-10-08: account/register route tests; per-pot lock for pledge writes (+ concurrency tests); webpack build so the service worker ships; install prompt (fr/en); pots are handed to the biggest remaining pledger when their organiser deletes their account.
- 2026-10-07 (hardening): lint at 0 warnings with React 19 rules as errors; server now enforces wishlist access and `allowSuggestions` on proposing a wish, and invited guests can act on private lists; route tests for CRUD, comments, share.
- 2026-10-07 (follow-up): service worker never caches pages/RSC/API and purges legacy user-data caches; offline fallback precached; theme colours aligned with tokens; route tests; owner pot-existence leak fixed on `/api/wishlist/contribute`; `eslint --fix` import-order pass (now an error).
- 2026-10-07: removed the mock layer; `middleware.ts` → `proxy.ts`; transactional deletes and a complete account purge; orphan-cleanup and KV backup/restore scripts; CSV export of pledges; working lint; Vitest + first tests; README, CHANGELOG, `docs/runbook.md`, `docs/decisions.md`.
- Dropped: per-wishlist `allowComments` toggle. The setting was removed on purpose earlier; see `docs/decisions.md`.
