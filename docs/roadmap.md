# Roadmap

Updated 2026-10-08. Edit freely; this is a starting point, not a commitment.

Legend: **[B]** blocker for real users · **[P]** production readiness · **[Bug]** known defect · items without a tag are improvements.

## Now: make it launchable

Ordered: do these top to bottom. All of these need something outside the repo.

1. **[P] Separate dev KV from production.** Provision a dedicated development KV database (and one for Vercel's Preview environment), so `.env.local` and the scripts in `scripts/` never touch production data. Prerequisite for the QA below.
2. **[B] Browser QA of the per-wish gift pot and the new account purge.** The gift pot merged 2026-08-29 without live QA (checklist: `docs/superpowers/specs/2026-08-28-gift-pot-per-wish-design.md`, Testing section). The purge and the CSV exports are covered by unit tests against an in-memory KV, never against a real one: run it once on a development database, with a throwaway account that has pledges, comments and a reservation on someone else's list. **Do not point this at production data.**
3. **[B] Send invite emails** via Resend from `api/wishlist/share`. Today the invitee is only recorded in `wishlist:{id}:invitees`; invited people are never notified. Needs a verified Resend sender domain.
4. **[P] Production environment check.** Confirm `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Google OAuth redirect URIs and Resend sender-domain verification in the Vercel dashboard (checklist in `docs/runbook.md`).
5. **[P] Resolve the `(verify)` items in `docs/runbook.md`**: Git-deploy behaviour, and whether the KV plan has its own backups.

## Next: debt and follow-ups

- Route, page and race tests cover the app (155 Vitest tests) and `e2e/` runs the main flows in Playwright. Still untested: the client views, and everything against a real KV (see Now).
- Run `scripts/cleanup-orphans.mjs` (dry run first, after a `kv-backup.mjs backup`) against production to clear orphans left by pre-transaction deletes.
- Not locked: comment lists, and cross-record races such as deleting a wishlist while a pledge lands on one of its wishes. **Deleted accounts keep a valid JWT**: until it expires, routes that only check the session id (e.g. creating a wishlist) would act for a user who no longer exists. Consider checking the account in the `jwt` callback (one KV read per session check).
- **PWA: verify on a deploy.** The build is now `next build --webpack`, so `sw.js` ships. Check a Vercel preview: registration, the offline fallback, the install banner on Android Chrome and iOS Safari, and a Lighthouse PWA audit. Revisit `@serwist/turbopack` if build time becomes a problem.

## Later

- Cover images: upload + storage (e.g. Vercel Blob); the `coverImage` field already exists on `TWishlist`.
- Notifications: reservation, new suggestion, pot funded, "you are now organiser of a pot" (needs the email pipeline).
- **Privacy page review.** `/privacy` (fr/en) is live as a draft, linked from the footer. Needs a lawyer's review (points in `docs/decisions.md`), then set `NEXT_PUBLIC_PRIVACY_CONTACT` and `NEXT_PUBLIC_PRIVACY_REVIEWED=1` in Vercel.
- Evaluate moving relational data off KV if query needs outgrow it.

## Done

- 2026-10-08 (second pass): server page tests; per-record locks on every wish/wishlist writer (fixes double reservation and lost edits); race tests on a latency-simulating fake KV; Playwright e2e on an in-memory KV; brand app icons (maskable, iOS, favicon); `/privacy` page (fr/en, draft) and footer.
- 2026-10-08: account/register route tests; per-pot lock for pledge writes (+ concurrency tests); webpack build so the service worker ships; install prompt (fr/en); pots are handed to the biggest remaining pledger when their organiser deletes their account.
- 2026-10-07 (hardening): lint at 0 warnings with React 19 rules as errors; server now enforces wishlist access and `allowSuggestions` on proposing a wish, and invited guests can act on private lists; route tests for CRUD, comments, share.
- 2026-10-07 (follow-up): service worker never caches pages/RSC/API and purges legacy user-data caches; offline fallback precached; theme colours aligned with tokens; route tests; owner pot-existence leak fixed on `/api/wishlist/contribute`; `eslint --fix` import-order pass (now an error).
- 2026-10-07: removed the mock layer; `middleware.ts` → `proxy.ts`; transactional deletes and a complete account purge; orphan-cleanup and KV backup/restore scripts; CSV export of pledges; working lint; Vitest + first tests; README, CHANGELOG, `docs/runbook.md`, `docs/decisions.md`.
- Dropped: per-wishlist `allowComments` toggle. The setting was removed on purpose earlier; see `docs/decisions.md`.
