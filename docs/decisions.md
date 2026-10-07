# Decisions

Short records of choices that are not obvious from the code. Newest first. Add one when you make a call someone might later question.

## Account deletion erases the user's contributions elsewhere
**Decision.** `DELETE /api/user/me` removes the user's pledges, comments, reservations/purchases and organised pots on other people's content, not just their own wishlists.
**Why.** Erasure should be complete. Pledges are non-binding intentions (no money moves through Kageo), so dropping an organiser's pot loses an intention, not funds. A purchase stays marked `purchased` (only the buyer's identity is removed) so the owner is not told the gift is unbought.
**Cost.** Other contributors to a deleted organiser's pot lose their pledge silently. Acceptable until pots can be handed over.

## Cascades are transactions; the account record is deleted last
**Decision.** Multi-key deletes use `kv.multi()` (`shared/lib/kvCascade.ts`). The account purge is several idempotent transactions, ending with the account record.
**Why.** KV has no cascades and a non-atomic delete leaves orphans. A purge is too large for one transaction, so it is ordered so a failed run can be retried: until the account record is gone, the user can still sign in and try again.

## Comments are always on (no `allowComments` toggle)
**Decision.** Do not add a per-wishlist comments toggle.
**Why.** The setting was deliberately removed earlier (see `docs/superpowers/plans/2026-08-24-i18n-coverage.md`); comments are part of the coordination loop and are already hidden from the owner. The roadmap line describing a "flag that exists, unused" was stale: no such flag is in the code. Reopen only with a concrete use case.

## Pots are a surprise from the owner
**Decision.** Both pot types, and guest comments, are hidden from the wishlist owner. Role-shaped payloads come from one place (`readPotForViewer`, `readGiftPotForViewer`).
**Why.** The product is about coordinating gifts without spoiling them. Centralising the rule keeps routes and UI from re-deriving it. The CSV exports reuse the same readers so they cannot leak more than the UI shows.

## `npm`, not `pnpm`
`package-lock.json` is committed and `pnpm` is not on PATH in the shells used here.

## Display font is Fraunces
Bound to the `--font-cormorant` CSS variable for historical reasons. Cormorant Garamond was dropped on purpose; do not reintroduce it.

## Lint: native flat config, warnings for historical debt
`next lint` was removed in Next 16 and `FlatCompat` crashes with `eslint-config-next` 16, so `eslint.config.mjs` uses its native flat exports. `import/order` was autofixed (once) and, with the React 19 rules, is an error; lint is at 0 warnings. `_`-prefixed names and rest-sibling omissions may be unused.

## The service worker never caches user data
**Decision.** In `src/sw.ts`, navigations, RSC payloads and `/api/*` are network-only, ahead of Serwist's `defaultCache` (which would cache them network-first for 24h). Caches named `apis`, `pages`, `pages-rsc`, `pages-rsc-prefetch` are deleted on activate.
**Why.** Responses are per-user and role-shaped (pots are hidden from the owner). A shared device must never replay the previous user's data when the network is slow. Cost: no offline reading of lists; only static assets and the offline fallback page are cached.

## Access is decided on the server, by one helper
**Decision.** Any route that lets a non-owner act on a wishlist (propose a wish, reserve, mark purchased, pledge, comment) uses `getWishlistAccess`: the owner, anyone on a public list, or a guest invited (by email) to a private one. Suggestions additionally require `allowSuggestions !== false` (a missing flag counts as open, like the page).
**Why.** The UI hid buttons, but the API trusted the client: any signed-in user could write to any list, and invited guests of private lists were locked out of reserving and pledging. Pot *creation* still additionally requires an invitation, by design.
