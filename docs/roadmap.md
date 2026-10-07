# Roadmap

Updated 2026-10-07. Edit freely; this is a starting point, not a commitment.

Legend: **[B]** blocker for real users · **[P]** production readiness · **[Bug]** known defect · items without a tag are improvements.

## Now: make it launchable

Ordered: do these top to bottom. All of these need something outside the repo.

1. **[P] Separate dev KV from production.** Provision a dedicated development KV database (and one for Vercel's Preview environment), so `.env.local` and the scripts in `scripts/` never touch production data. Prerequisite for the QA below.
2. **[B] Browser QA of the per-wish gift pot and the new account purge.** The gift pot merged 2026-08-29 without live QA (checklist: `docs/superpowers/specs/2026-08-28-gift-pot-per-wish-design.md`, Testing section). The purge and the CSV exports are covered by unit tests against an in-memory KV, never against a real one: run it once on a development database, with a throwaway account that has pledges, comments and a reservation on someone else's list. **Do not point this at production data.**
3. **[B] Send invite emails** via Resend from `api/wishlist/share`. Today the invitee is only recorded in `wishlist:{id}:invitees`; invited people are never notified. Needs a verified Resend sender domain.
4. **[P] Production environment check.** Confirm `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Google OAuth redirect URIs and Resend sender-domain verification in the Vercel dashboard (checklist in `docs/runbook.md`).
5. **[P] Resolve the `(verify)` items in `docs/runbook.md`**: Git-deploy behaviour, and whether the KV plan has its own backups.

## Next: debt and follow-ups

- Route tests cover wish/wishlist CRUD, access rules, comments, share, pots and pledges (81 tests). Still untested: account routes (`user/me` GET/PATCH, password, export, stats), register, and the server pages. Consider Playwright for the main flows.
- Run `scripts/cleanup-orphans.mjs` (dry run first, after a `kv-backup.mjs backup`) against production to clear orphans left by pre-transaction deletes.
- The read-modify-write paths (pledge totals, funded reconciliation) are atomic only at the final write; use `WATCH`/a Lua script if concurrent pledging becomes real.
- **Decide how the PWA ships.** `npm run build` uses Turbopack and `@serwist/next` does not support it, so **no `sw.js` is generated or registered in production today**: only the manifest ships. Either build with `next build --webpack` (simple, slower builds) or migrate to `@serwist/turbopack`. Until then the offline fallback and cache rules in `src/sw.ts` are inert (they compile and were checked with a webpack build only).
- Then, once a service worker really ships: an install prompt (`beforeinstallprompt` on Android/desktop, an "Add to Home Screen" hint on iOS, fr/en strings), and a Lighthouse PWA audit on the production build.
- **Brand app icon.** The current icon is a placeholder (sky-blue rounded "K", off-brand against the sage-green UI). Needs a designed full-bleed maskable icon and an iOS touch icon (no transparency or baked-in rounded corners).

## Later

- Cover images: upload + storage (e.g. Vercel Blob); the `coverImage` field already exists on `TWishlist`.
- Notifications: reservation, new suggestion, pot funded (needs the email pipeline).
- Privacy page and a written data-retention policy (needs legal review; the behaviour is documented in `docs/decisions.md`).
- Hand over a pot to another organiser instead of dropping it when the organiser deletes their account.
- Evaluate moving relational data off KV if query needs outgrow it.

## Done

- 2026-10-07 (hardening): lint at 0 warnings with React 19 rules as errors; server now enforces wishlist access and `allowSuggestions` on proposing a wish, and invited guests can act on private lists; route tests for CRUD, comments, share.
- 2026-10-07 (follow-up): service worker never caches pages/RSC/API and purges legacy user-data caches; offline fallback precached; theme colours aligned with tokens; route tests; owner pot-existence leak fixed on `/api/wishlist/contribute`; `eslint --fix` import-order pass (now an error).
- 2026-10-07: removed the mock layer; `middleware.ts` → `proxy.ts`; transactional deletes and a complete account purge; orphan-cleanup and KV backup/restore scripts; CSV export of pledges; working lint; Vitest + first tests; README, CHANGELOG, `docs/runbook.md`, `docs/decisions.md`.
- Dropped: per-wishlist `allowComments` toggle. The setting was removed on purpose earlier; see `docs/decisions.md`.
