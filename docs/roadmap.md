# Roadmap

Updated 2026-10-22. Edit freely; this is a starting point, not a commitment. Product context (purpose, persona, freemium principles) is in `docs/product.md`.

Legend: **[B]** blocker for real users · **[P]** production readiness · **[Bug]** known defect · items without a tag are improvements.

Phases: **Launch** (family, Christmas 2026) → **Open** (friends and friends of friends, up to a few hundred users) → **Monetise** (freemium, payments) → **Expand** (event suite, vision only).

## 1. Launch — family, Christmas 2026

Success test: the creators' own circle uses Kageo for one real event. No new features beyond this list before launch. Most items need something outside the repo. Ordered, top to bottom:

1. ~~**[P] Separate dev KV from production.**~~ Done 2026-10-22: `kageo-dev` serves Preview and Development; see `docs/runbook.md`.
2. ~~**[B] Browser QA of the per-wish gift pot and the account purge.**~~ Done 2026-10-22 on `kageo-dev` with two throwaway accounts (owner, invited guest): all nine gift-pot checks pass and the purge removed everything it should (pots, pledges, comments, invites, reservation released; owner purge removed the wishlist and its wishes). Still not covered: a second pledger on the same pot, the other languages, and a real-device pass. Findings below.
   Found in that QA, to fix before Christmas:
   - ~~**[Bug] Owner sees the surprise in the header stats.**~~ Fixed 2026-10-22: the wishlist page now sends the owner every wish as `wanted` with nobody named (no `reservedBy`/`purchasedBy`/names in the payload), so the header stats and completion % cannot reveal reservations or purchases. The one exception is a list whose event date has passed, opened from history, where the owner sees who gave what; `?mode=history` alone no longer unmasks a live list (it used to).
   - ~~**[Bug] Logging in from the modal on a shared wishlist leaves the page signed-out until reload.**~~ Fixed 2026-10-22: the header refreshes the server tree after a successful login or sign-up, and the wishlist page remounts its client keyed by the signed-in user. Covered by `e2e/guest-view.spec.ts`.
   - ~~Untranslated English in the French UI~~ ("Remove", "Cancel Reservation", "Mark Purchased", their loading labels and error fallbacks): fixed 2026-10-22, now in `wishCard` / `wishlistToast` in both languages.
   - Data export omits the user’s pledges, comments and reservations on other people’s lists; decide whether a data-access request needs them (see `docs/decisions.md`).
   - ~~Minor~~ fixed 2026-10-22: `placeholder.svg` lived in `src/public/` (404 on every list without a cover and on the features page); invalid SVG `rx="6 0 0 6"` on the empty-state illustration; the wrong checklist item 5 in the gift-pot spec.
3. ~~**[B] Send invite emails** via Resend.~~ Shipped 2026-10-23 (see Done). Still needs your part outside the repo: a verified Resend sender domain, then `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel (Preview and Production) and `.env.local`; the real-delivery check on a phone waits for that.
4. **[B] Forgot / reset password by email.** Today a user who forgets their password is locked out. Uses the same Resend pipeline as item 3.
5. **[P] Production environment check.** Create the production KV database (none exists yet; the old one was archived), connected to Production only. Confirm `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, Google OAuth redirect URIs and Resend sender-domain verification in the Vercel dashboard (checklist in `docs/runbook.md`).
6. **[P] Resolve the `(verify)` items in `docs/runbook.md`**: Git-deploy behaviour, and whether the KV plan has its own backups.

## 2. Open — beyond the family

Exit criteria from Launch to Open:
- Privacy page reviewed by a lawyer (points in `docs/decisions.md`), plus terms of service; then set `NEXT_PUBLIC_PRIVACY_CONTACT` and `NEXT_PUBLIC_PRIVACY_REVIEWED=1` in Vercel.
- Privacy-friendly analytics to measure the success test.
- Onboarding flow for a first-time organiser.
- Rate limiting and abuse protection (extend the Launch work; add bot protection such as Cloudflare Turnstile on public actions).
- A feedback channel.
- Email verification (invites match by email, so addresses should be proven).

Features and debt:
- **Wishlist export for people who are not online** (moved from Launch 2026-10-22): a print-friendly view first, then a CSV of the wishlist (wishes, status, link). Pledge CSV already exists. Never include reservations or pots in what the owner can print or export (surprise).
- **Magic-link sign-in** (passwordless) as a simplicity experiment, alongside Google and password.
- **Amazon-specific wish import** (the generic URL import shipped 2026-10-22; Amazon often blocks server fetches). *Considered, not planned:* the official Product Advertising API needs an Associates account with qualifying sales and has usage terms; scraping breaks Amazon's terms. Affiliate links conflict with the no-ads principle and would need disclosure.
- **Cover images**: upload + storage (e.g. Vercel Blob); the `coverImage` field already exists on `TWishlist`.
- **Notifications (essential, free)**: pot funded, "you are now organiser of a pot", new suggestion. Never tell the owner about reservations (surprise).
- **"Create your own list" prompt** on public lists, the main growth loop. No marketing before then; word of mouth.
- **Reserve without an account** as an experiment only. Competitors (e.g. iKadoo) offer it, but the owner cannot see reservations, so fake/bot reservations would go unnoticed. If tested: confirmed email (one-click link), not name-only; bot protection; rate limits; show the reserver's name to other guests. Possibly a reservation expiry with a reminder (product decision to make).
- Route, page and race tests cover the app (643 Vitest tests) and `e2e/` runs the main flows in Playwright. Still untested: the client views, and everything against a real KV (see Launch).
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

- 2026-10-23: invite emails and link access to private lists. Inviting an address from the Share dialog now sends a short email through Resend (subject "You've been invited to a wishlist on Kageo: {name}", a recap of the list, one button; fr or en following the owner's language) and saves the invite only if the email went out; errors are specific (address refused, service unavailable, rate limit) and an already-invited address says so. Each address can receive 10 invite emails a day across all owners. Anyone with the link can now read a private list, signed in or not; acting still needs an account whose email was invited, and a stranger who tries gets one calm "ask to be invited" message. Private lists are not shown on the owner's public profile. Spec: `docs/superpowers/specs/2026-10-23-invite-emails-design.md`. Not included: reminders or re-send, delivery tracking, email verification at sign-up (an invitation is only as strong as the address is honest; see Open).
- 2026-10-22: safe-bet gifts: a standing list on the owner's profile (title, optional description and image URL; up to 30, reorderable) shown on every wishlist they share, for things they would always welcome. No reserving: givers coordinate in an owner-hidden comment thread per entry (`safe-bets` routes, `user:{id}:safeBets`, `safebet:{id}:comments`; covered by account purge and export; see `docs/architecture.md`). Not included: image upload (URL only), and the list shows on shared wishlists only, not on the public profile page. Spec: `docs/superpowers/specs/2026-10-22-safe-bet-gifts-design.md`.
- 2026-10-22: mobile and grandma audit of the public-link flow (375px, signed-out, touch). Found and fixed: signed-out guests saw no Reserve button at all (now shown, tapping asks them to log in); the Reserve button was hardcoded English (now fr/en); tap targets under 44px (actions, filters, sort, price inputs, comments, pot triggers, footer/logo/language links, modal close) and text under 12-14px. A Playwright test (`e2e/guest-view.spec.ts`) covers the guest view. Not audited: the signed-in action modals and a real-device pass (do one before Christmas).
- 2026-10-22: wish import from a URL: paste a product link in the add, propose or edit form and press "Fill in for me" to fill the name, description, image, price and currency from Open Graph / schema.org data (`POST /api/wish/import`, signed-in, rate limited, SSRF-hardened fetch, nothing stored; see `docs/architecture.md`). Nothing runs until the button is pressed; a typed value is never overwritten (Edit asks Replace or Only fill empty); pages with several product versions ask which one is yours (or pick the closest to a typed price); share text with a link is reduced to the link. Sites that block server fetches fall back to manual entry. Amazon-specific import stays out (see Open).
- 2026-10-21: basic rate limiting (KV fixed-window counters): failed sign-ins per email and IP, registration, and reserve, contribute, comment, suggest, invite and other writes, plus a per-IP ceiling; 429 with `Retry-After` and a calm UI message (see `docs/architecture.md`). Password reset and bot protection come with their own items.
- 2026-10-21: product direction defined (purpose, persona, freemium principles, phases); docs updated.
- 2026-10-08 (second pass): server page tests; per-record locks on every wish/wishlist writer (fixes double reservation and lost edits); race tests on a latency-simulating fake KV; Playwright e2e on an in-memory KV; brand app icons (maskable, iOS, favicon); `/privacy` page (fr/en, draft) and footer.
- 2026-10-08: account/register route tests; per-pot lock for pledge writes (+ concurrency tests); webpack build so the service worker ships; install prompt (fr/en); pots are handed to the biggest remaining pledger when their organiser deletes their account.
- 2026-10-07 (hardening): lint at 0 warnings with React 19 rules as errors; server now enforces wishlist access and `allowSuggestions` on proposing a wish, and invited guests can act on private lists; route tests for CRUD, comments, share.
- 2026-10-07 (follow-up): service worker never caches pages/RSC/API and purges legacy user-data caches; offline fallback precached; theme colours aligned with tokens; route tests; owner pot-existence leak fixed on `/api/wishlist/contribute`; `eslint --fix` import-order pass (now an error).
- 2026-10-07: removed the mock layer; `middleware.ts` → `proxy.ts`; transactional deletes and a complete account purge; orphan-cleanup and KV backup/restore scripts; CSV export of pledges; working lint; Vitest + first tests; README, CHANGELOG, `docs/runbook.md`, `docs/decisions.md`.
- Dropped: per-wishlist `allowComments` toggle. The setting was removed on purpose earlier; see `docs/decisions.md`.
