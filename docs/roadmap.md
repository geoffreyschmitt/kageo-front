# Roadmap

Updated 2026-10-07. Edit freely; this is a starting point, not a commitment.

Legend: **[B]** blocker for real users · **[P]** production readiness · **[Bug]** known defect · items without a tag are improvements.

## Now: make it launchable

Ordered: do these top to bottom. All three need something outside the repo.

1. **[B] Browser QA of the per-wish gift pot and the new account purge.** The gift pot merged 2026-08-29 without live QA (checklist: `docs/superpowers/specs/2026-08-28-gift-pot-per-wish-design.md`, Testing section). The purge and the CSV exports are covered by unit tests against an in-memory KV, never against a real one: run it once on a development database, with a throwaway account that has pledges, comments and a reservation on someone else's list. **Do not point this at production data.**
2. **[B] Send invite emails** via Resend from `api/wishlist/share`. Today the invitee is only recorded in `wishlist:{id}:invitees`; invited people are never notified. Needs a verified Resend sender domain.
3. **[P] Production environment check.** Confirm `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Google OAuth redirect URIs and Resend sender-domain verification in the Vercel dashboard (checklist in `docs/runbook.md`).
4. **[P] Resolve the `(verify)` items in `docs/runbook.md`**: Git-deploy behaviour, and whether the KV plan has its own backups.

## Next: debt and follow-ups

- Raise `import/order` and the React 19 rules (`react-hooks/purity`, `set-state-in-effect`) from warnings to errors after an autofix pass (~300 warnings today).
- Tests beyond the pot logic: route-level tests for reserve / mark-purchased / contribute using `src/test/fakeKv.ts`; consider Playwright for the main flows.
- Run `scripts/cleanup-orphans.mjs` (dry run first, after a `kv-backup.mjs backup`) against production to clear orphans left by pre-transaction deletes.
- The read-modify-write paths (pledge totals, funded reconciliation) are atomic only at the final write; use `WATCH`/a Lua script if concurrent pledging becomes real.
- Organiser is tagged in pot contributor lists by display-name equality; add `creatorId` matching.
- Finish the PWA. The base already ships (Serwist service worker in `src/sw.ts`, `src/app/manifest.ts`, 192/512 icons), but it is not installable-grade yet:
  - Real maskable icon (today the 512 icon is reused with padding-less art) and an `apple-touch-icon` for iOS.
  - Offline fallback page (`fallback` entry in the Serwist config) instead of the browser error.
  - Install prompt (`beforeinstallprompt` on Android/desktop, an "Add to Home Screen" hint on iOS), fr/en strings.
  - Check what `defaultCache` does with authenticated `/api` GETs: pot payloads are role-shaped and hidden from the owner, so they must never be served from a shared or stale cache.
  - Align `theme_color` / `background_color` with the light/dark theme tokens and run a Lighthouse PWA audit on the production build.

## Later

- Cover images: upload + storage (e.g. Vercel Blob); the `coverImage` field already exists on `TWishlist`.
- Notifications: reservation, new suggestion, pot funded (needs the email pipeline).
- Privacy page and a written data-retention policy (needs legal review; the behaviour is documented in `docs/decisions.md`).
- Hand over a pot to another organiser instead of dropping it when the organiser deletes their account.
- Evaluate moving relational data off KV if query needs outgrow it.

## Done

- 2026-10-07: removed the mock layer; `middleware.ts` → `proxy.ts`; transactional deletes and a complete account purge; orphan-cleanup and KV backup/restore scripts; CSV export of pledges; working lint; Vitest + first tests; README, CHANGELOG, `docs/runbook.md`, `docs/decisions.md`.
- Dropped: per-wishlist `allowComments` toggle. The setting was removed on purpose earlier; see `docs/decisions.md`.
