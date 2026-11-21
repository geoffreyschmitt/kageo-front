# Wish reordering — design

Status: awaiting approval · Date: 2026-11-21

## Intent and why

A wishlist owner can put their wishes in their own order, in both the "Most wanted" panel and the regular "All ideas" list. The motivating case: a long regular list where a few wishes are liked a little more than the rest, and the owner wants to push them to the front without promoting them to "most wanted". More generally: "order them as I want".

The order is part of how the owner presents the list, so guests see it too.

## Goals

- Owner can reorder wishes within each section, from phone or desktop, with touch, mouse or keyboard.
- "Move to top" is a first-class one-tap action (the main use case is long-distance moves).
- Guests see the owner's order by default.
- Existing wishlists look exactly as they do today until the owner reorders.

## Non-goals / anti-goals

- No cross-section drag that changes priority. Priority is still set in the edit form.
- No reordering for guests, in history, or of suggestions (proposed wishes).
- No per-viewer custom order.
- Anti-goal: anything that makes the normal wishlist view heavier or easier to rearrange by accident. The grid stays as it is.

## Constraints

- Today wishes live in an unordered set `wishlist:{id}:wishes`; ordering is client-side sort (name/price/date) in `views/wishlist/wishlist.tsx`.
- Read-modify-write on a wishlist goes through `withLock(wishlistLock(id))` and re-reads inside the lock; multi-key writes use `kv.multi()`; account/wishlist deletion cascades via `shared/lib/kvCascade.ts` (`queueWishlistDeletion`).
- FSD layering; new strings in both `fr.json` and `en.json`; `npm run build` is the verification gate.
- Surprise rule is untouched: ordering exposes no reservation/pot information. Order is the owner's own data.
- No drag-and-drop library is installed.

## Approaches considered

- **A. Always-on drag and drop on the grid.** Most direct, but long-distance drags across a multi-row grid on a phone are painful, and drags conflict with scrolling and card buttons. Rejected.
- **B. Buttons only (move to top, up/down).** Simple and accessible, but fine-tuning a long list takes many taps. Rejected as the main interaction.
- **C. A "Reorder" mode (chosen by Geoffrey).** The grid collapses into compact rows with a drag handle and a "to top" button; "Done" saves.

Storage alternatives: a position number on each wish (many records written per reorder, needs several locks) versus one stored id list per wishlist (one write under one lock). The single list is the pick; see below.

## Design

### Data

New KV value `wishlist:{id}:order`: a JSON array of wish ids, global across both sections. Sections are partitions of it by priority, so a wish keeps its relative position if its priority changes later.

Reading: wishes whose id is in the list sort by their index; wishes not in the list (never reordered, or added since) come first, newest first, then the ordered ones. This reproduces today's default (newest first) for lists with no order key, and new wishes appear at the top. Stale ids (deleted wishes) are ignored on read and pruned on write.

### API

`PUT /api/wishlist/[id]/order` with `{ order: string[] }`.
- Auth required, owner only, rate limited like other writes, runs under `wishlistLock(id)`.
- Validates that every id belongs to the wishlist's wish set and that there are no duplicates; unknown ids → 400. Ids of wishes that exist but are omitted are appended in their current order rather than rejected (guards against a wish added in another tab).
- Writes the key and returns the stored order.

`GET /api/wishlist/[id]` and the server page `app/[locale]/wishlist/[id]/page.tsx` read the key and return the wishes already ordered (the page passes items in order, plus the sorting rule below).

`queueWishlistDeletion` deletes the key. Account purge goes through it already.

### UI

- Owner, non-history, with at least two reorderable wishes: a "Reorder" button in the list toolbar area.
- Entering the mode clears filters and sort, and swaps the "Most wanted" panel and the "All ideas" list for compact rows (handle, thumbnail, name, "to top" button), still in their two sections. A "Done" button and a "Cancel" button replace "Reorder".
- Drag via the handle (touch, mouse and keyboard-accessible), using `@dnd-kit/core` + `@dnd-kit/sortable`. "To top" moves the wish to the top of its own section. Drags stay inside the section.
- "Done" sends one `PUT` with the full order, optimistically updates the view, and rolls back with an error toast on failure (same pattern as the other `onXError` callbacks). "Cancel" discards.
- Outside reorder mode the cards render as today.
- Sort control gains a "Manual order" option, which becomes the default for everyone. It ignores asc/desc. With no stored order it behaves as newest-first, so `isDefaultView` and "Clear filters" keep working with the new default. Guests label it "Owner's order".

New component code: `features/ReorderWishes/` (model hook + `ui/` rows and toolbar); `shared/api/wishlist/reorder.ts` fetch wrapper; ordering helper (pure function, unit tested) in `entities/wishlist` or `shared/lib`.

### Testing

- Vitest: the ordering helper (unlisted first and newest first, stale ids, empty order); the route (auth, owner only, unknown id, omitted id appended, duplicate ids, stale prune) using `createFakeKv`; a concurrency test with `createFakeKv({ latency: true })`.
- Playwright: owner reorders and uses "to top", reloads, order persists; guest sees the same order.

### Docs

Update `docs/architecture.md` (new KV key and route) and move the item on `docs/roadmap.md` in the same change.

## My calls (not yet confirmed by Geoffrey)

- New dependency `@dnd-kit/core` + `@dnd-kit/sortable`, chosen for touch and keyboard support. Alternative if you'd rather not add one: handle plus up/down/"to top" buttons only, no drag.
- One global order list instead of one per section.
- New wishes appear at the top (matches today's behaviour).
- "Manual order" is the default sort for everyone, including guests.
- "Reorder" button hidden with fewer than two reorderable wishes; reorder mode clears filters.
- Server does not reject reorders on past-event wishlists; the UI gates it with `isHistory`, like other owner actions. The builder may add a server check if the history rule exists elsewhere in the API.

## Left to the builder

Visual styling and spacing of the compact rows (follow existing CSS-module tokens), exact i18n copy, toast wording, how to treat purchased wishes in the regular section (they stay in "All ideas", ordered like any other), drag overlay details, and where precisely the toolbar button sits next to `WishFilterBar`.
