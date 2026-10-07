# Changelog

User-visible and operational changes, newest first. Dates are merge/commit dates.

## Unreleased

### Added
- CSV export of pledges for organisers of a wishlist pot and of a per-wish gift pot.
- Account deletion now removes everything tied to the user, not just their own wishlists: pledges, comments, reservations and purchases on other people's lists, pots they organised, and invitations they received.
- `scripts/kv-backup.mjs` (KV backup / restore) and `scripts/cleanup-orphans.mjs` (find and remove orphaned keys); see `docs/runbook.md`.
- Unit tests (Vitest) covering funded-status reconciliation, pot role rules, CSV output and the account purge.
- `docs/runbook.md`, `docs/decisions.md`, `.env.example`; a real README.

### Changed
- Deleting a wish or wishlist, replacing a pledge, creating a wish/wishlist, inviting someone and signing up now run as single KV transactions, so a mid-way failure no longer leaves orphaned keys.
- Deleting a wish or wishlist now also deletes its comments (they were previously left behind).
- `src/middleware.ts` renamed to `src/proxy.ts` (Next 16 convention).
- ESLint works again on Next 16 (native flat config). `npm run lint` reports 0 errors; import-order and a few React 19 rules are warnings.

### Removed
- The dead mock layer: `lib/mock*.ts` files and every `useMock` flag.

## 2026-10-03
- Removed the unused email-confirmation token flow.
- Gift-pot review follow-ups; architecture, roadmap and product docs added.

## 2026-09-01
- Optional date of birth on the account page.

## 2026-08-29
- Per-wish gift pot ("cagnotte par cadeau") with a `funded` wish status.
- Wish comments drawer and card counter; reserver/purchaser shown by name.

## 2026-08-28
- Product-led landing page redesign.
