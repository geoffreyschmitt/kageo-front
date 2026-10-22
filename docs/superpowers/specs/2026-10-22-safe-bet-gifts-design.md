# Safe-bet gifts (recurring gifts) — design

Status: agreed in conversation 2026-10-22, **not built**. Roadmap phase: Open.

## Why

Some people (Geoffrey is the example) buy what they need when they need it. At birthday or Christmas their wishlist is nearly empty, and relatives have nothing to go on. They would still welcome certain things that are safe to give: MTG booster packs, wine, books, games, trading cards. Re-listing these in every wishlist is tedious and clutters each list.

## What

A standing list of **safe bets** on the owner's profile. It shows on every wishlist the owner shares, with no per-wishlist switch.

### Entry
- `title` (required), e.g. "Magic: The Gathering boosters".
- `description` (optional free text): detail such as "Foundations only, red wine not sweet". Price or link go here as plain text; no dedicated fields.
- `imageUrl` (optional): a pasted image URL with a preview, as wishes do today. No uploads (uploads are a separate Open-phase item).
- Owner can add, edit, reorder, delete.

### Guests
- Anyone who can view a wishlist of the owner sees the list, including signed-out guests (grandma test: readable on a phone, no account).
- Labelled as ideas the owner would be happy to receive, distinct from specific wishes.
- Acting (commenting) needs an account, as everywhere else.

### Comments
- One comment thread per entry, same behaviour as wish comments: **hidden from the owner** (surprise is sacred).
- Duplicates are handled socially in the thread ("I'm getting Dune, the first book"). No per-entry mode.

## Non-goals
- No reserving, no "taken" state, no repeatable vs one-off setting, no purchase tracking.
- No pots or payments on safe bets.
- No per-wishlist toggle (explicitly decided against).
- No paywall; available to everyone for now.

## Implementation notes (for the planner)
- Reuse the comment mechanism and `shared/lib/wishlistAccess.ts` owner-vs-guest resolution; thread access is by whether the viewer can see any of the owner's wishlists. Decide how a signed-in guest's access is determined when the entry is not under one wishlist (builder's call).
- New KV keys (document in `docs/architecture.md`): per-user list of entries and per-entry comment list.
- Writes go through `withLock` and `kv.multi()` per the repo conventions; account purge (`purgeUser.ts`) must delete the entries and their comments.
- Add rate limiting to the new comment writes (existing `comment` rule).
- All strings in both `fr.json` and `en.json`; 44px tap targets; FSD layout (`entities/safeBet`, `features/...`, widget on the wishlist view).
- Update `docs/architecture.md` and move the roadmap item when shipped.

## Open to the builder
Visual layout of the section on the wishlist page; entry ordering UI; whether the profile page or a dedicated page hosts the editor.
