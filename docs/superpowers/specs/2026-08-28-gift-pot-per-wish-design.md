# Gift pot per wish — design

**Date:** 2026-08-28
**Status:** Approved, pending implementation plan
**Branch:** `feat/gift-pot`

## Problem

The homepage redesign (commit `91c155b`) advertises a feature that does not exist:
opening a shared money pot ("cagnotte") **on any individual gift**, with a funding
**goal**, so several people can club together for one expensive item.

Today the only pot lives at the **wishlist** level (`wishlist:{id}:pot`, one per
list, no goal). This design adds a **per-wish** pot alongside it.

## Decisions (settled with the product owner)

1. **Coexistence, not replacement.** The wishlist-level pot
   (`features/CreatePot`, `features/ContributePot`, `widgets/PotCard`,
   `/api/wishlist/pot`, `/api/wishlist/contribute`) is left untouched. The
   per-wish pot is a separate, parallel subsystem.
2. **Goal = the wish's price, fixed.** Not stored on the pot, not editable, no
   PATCH route for it. Overfunding is allowed (e.g. €1540 raised on a €1499
   goal). A wish with **no price (`price <= 0`) cannot have a pot.**
3. **`funded` is a real wish status**, flipped server-side when contributions
   cross the goal, and revertible when they drop back below it. The pot
   organizer can override it with **"Mark as purchased"** → status becomes
   `purchased` while the "goal reached" pot display stays visible.
4. **New dedicated slices.** No generalisation of the existing pot slices.
   ~10% logic duplication is accepted in exchange for zero risk to the working
   wishlist pot.
5. **The pot is a surprise**, exactly like the wishlist pot and like
   reservations: never exposed to the wishlist owner in any form (data, status,
   badge, filter).

## Data model (Vercel KV)

Mirrors the wishlist pot, keyed by wish id:

| Key | Value | Notes |
|-----|-------|-------|
| `wish:{wishId}:pot` | `{ creatorId: string, creatorName: string, createdAt: string }` | Created with `{ nx: true }` — one pot per wish, ever. |
| `wish:{wishId}:contributions` | Redis list of JSON `{ userId, amount, contributedAt }` | Same shape as `wishlist:{id}:contributions`. |

- **Total contributed is computed from the list on every read**, never stored.
  This avoids a read-modify-write race on the `wish:{id}` record and makes the
  `funded` transition a pure function of `(total, wish.price)`.
- The `wish:{id}` record gains **nothing new** except that its `status` field may
  now hold `'funded'`.
- **Goal** is read from `wish.price` wherever it is needed.

## `funded` status

- `TWishStatus` in `entities/wish` gains `'funded'`.
- After every successful `POST` / `PATCH` to `/api/wish/contribute`, the route
  recomputes the total and reconciles the wish status:
  - `total >= price` **and** current status `=== 'wanted'` → set `'funded'`
  - `total < price` **and** current status `=== 'funded'` → set `'wanted'`
  - any other current status (`reserved`, `purchased`, `proposed`) → untouched
- `markPurchasedWish` route is extended: in addition to its current
  `reservedBy === userId` guard, it also allows
  `pot.creatorId === userId && wish.status === 'funded'`. On success the wish
  becomes `purchased`; **the pot key and contributions list are left intact** so
  `GiftPotSection` keeps rendering the "goal reached" panel.
- **Owner masking.** `page.tsx` already only exposes the pot view to
  non-owners. For the status itself:
  - `WishCard` computes `visibleStatus` — extend its existing
    reserved/purchased downgrade so `funded` also renders as `wanted` when
    `showOwnerAction` is set.
  - Audit `views/wishlist` (status filter, counts, any `status === …` branch)
    and every status-label map; wherever `reserved`/`purchased` are already
    special-cased for the owner, add `funded`.

## API routes (new, under `src/app/api/wish/`)

### `GET /api/wish/pot?wishId={id}`
Role-shaped payload via the shared `readGiftPotForViewer` helper:

- wishlist owner, or no pot, or no wish → **404**
- any other viewer → `{ creatorName, isCreator, totalContributed, myContribution,
  participantCount, goal, isFunded }`
- pot creator → the above **plus** `{ creatorId, contributors: [{ name, amount,
  lastContributedAt }] }`

### `POST /api/wish/pot` — create
Body `{ wishId }`. Guards, in order:
1. Logged in (`session.user.id`) — else 401
2. Wish exists (`wish:{wishId}`) — else 404
3. Parent wishlist exists — else 404
4. Caller is **not** the wishlist owner — else 403
5. Caller's email is in `wishlist:{wishlistId}:invitees` — else 403
6. `wish.price > 0` — else 422
7. `wish.status === 'wanted'` — else 409 (reserved / purchased / proposed / funded
   cannot get a new pot)
8. `kv.set(wish:{wishId}:pot, …, { nx: true })` — if it fails, 409

Returns `201` with the pot record.

### `POST /api/wish/contribute` — add a pledge
Body `{ wishId, amount }`. Shared `loadContext` helper, **mirroring
`/api/wishlist/contribute` exactly**: logged in (you pledge with an account),
non-owner, `wishlist.isPublic`, pot exists, `amount` is a number `> 0`. Then:
- `kv.lpush` the contribution
- recompute total, reconcile `funded` (see above)
- return `{ wishId, contribution, totalContributed, isFunded }`

### `PATCH /api/wish/contribute` — replace caller's own pledge
Body `{ wishId, amount }`, `amount >= 0` (`0` removes the pledge). Same
`loadContext` guards as POST (logged in, non-owner, public list, pot exists).
Read-modify-write on the list exactly like `/api/wishlist/contribute` PATCH.
Then recompute total,
reconcile `funded`, return `{ wishId, totalContributed, myContribution, isFunded }`.

### `readGiftPotForViewer` (`src/app/api/wish/pot/readGiftPot.ts`)
Server-only. Mirror of `readPotForViewer`, plus:
- reads `wish:{wishId}` for `price` (= `goal`) and to know the parent
  `wishlistId`
- `isFunded = totalContributed >= goal`
- owner-of-parent-wishlist → `null`
Shared by the `GET` route and by `page.tsx`.

## Server wiring — `wishlist/[id]/page.tsx`

- Keep the existing per-wishlist `potView` block unchanged.
- For **non-owners only**, after building `wishIds`:
  `const giftPots = await Promise.all(wishIds.map(wid =>
  readGiftPotForViewer({ wishId: wid, userId })))` and attach the matching view
  as `giftPot` on each `TWishCard` (`null` when the helper returns null).
- For owners, every `giftPot` is `undefined` (never fetched).
- `hasActivity`: `w.status !== 'wanted'` already covers `'funded'`; also OR-in
  "any wish has a pot" so a funded-then-reverted wish still blocks history edits
  if a pot exists. (Cheap: reuse the `giftPots`/pot-key lookups.)

## Feature slices (FSD)

### `shared/api/wish/`
- `getGiftPot.ts` — `getGiftPot(wishId)` client fetch (`404 → null`), exports
  `TGiftPotView`, `TGiftPotContributor`
- `createGiftPot.ts` — `POST`
- `contributeGiftPot.ts` — `POST` + `PATCH` (`amount: 0` = remove)

### `features/CreateGiftPot/`
- `model.ts` — hook: open/close modal, submit, error + success callbacks
- `ui/CreateGiftPotButton.tsx` — the **discreet one-line link**
  ("Trop cher pour une seule personne ? **Ouvrir une cagnotte**"). Renders
  nothing if not eligible.
- `ui/CreateGiftPotModal.tsx` — shows the goal (= wish price, read-only),
  the "you become the organiser / pledges are private" note, confirm / cancel.
- `index.ts`

### `features/ContributeGiftPot/`
- `model.ts` — hook: amount state, quick-pick chips, submit (POST or PATCH),
  remove (PATCH 0), error handling
- `ui/ContributeGiftPotModal.tsx` — amount field with currency prefix, chips
  (20 / 50 / 100 / Autre), "promise not a payment — the organiser collects"
  disclaimer, add / save / remove
- `index.ts`

### `widgets/GiftPotSection/`
Owns the **accordion** and the role-shaped body. Props: `giftPot`,
`giftPotEligible`, wish id, price, currency, parent event name, owner name,
`isLoggedIn`, `isInvited`, all the callbacks. Renders:
- **no pot + eligible + guest** → `<CreateGiftPotButton>`
- **no pot + not eligible** → nothing
- **pot, logged out** → collapsed accordion + "log in to contribute"
- **pot, guest, no pledge** → accordion: progress, participants, organiser,
  *Participer*
- **pot, guest, pledged** → accordion + "Vous : {amount} · Modifier"
- **pot, organiser** → accordion: progress, nominative scrolling list
  (scroll after ~3), privacy note, and — when `isFunded` — a
  *Marquer comme acheté* button (calls `markPurchasedWish`)
- **isFunded (any viewer)** → "Objectif atteint" label + closed-pot copy;
  no *Participer*
Collapsed summary is always: gift icon + "Cagnotte cadeau" (or "Objectif
atteint") + mini progress bar + `%`. Uses native `<details>`.
`WishCard.module.css` conventions; new CSS in `GiftPotSection.module.css`.

## `WishCard` changes

New props on `TWishCard`:
`giftPot?: TGiftPotView | null`, `onGiftPotCreated?`, `onContributeGiftPot?`,
`onContributeGiftPotError?`, `onGiftPotRemoved?`, `onGiftPotRefreshed?`.

- `giftPotEligible = price > 0 && status === 'wanted'` (computed in WishCard).
- `giftPotActive = giftPot != null`.
- Render `<GiftPotSection>` at the bottom of `wish-card__content`, in / around
  the `wish-card__actions` slot.
- **Button rules:**
  - `giftPotActive` → **no** `ReserveButton`; `Buy now` link shown **only** to
    the pot creator, and it lives inside `GiftPotSection`'s organiser view (not
    the normal actions row)
  - no pot, `giftPotEligible`, guest → the `CreateGiftPotButton` link (inside
    `GiftPotSection`)
  - `reserved` / `purchased` / `proposed` → no pot affordance at all
  - `funded` → no `ReserveButton` / `Buy now`; organiser gets
    *Marquer comme acheté* in `GiftPotSection`
- `visibleStatus`: add `'funded'` to the `showOwnerAction` downgrade.
- `getStatusClass` / label map: add `funded` (badge styled like `purchased` —
  sage).

## `WishlistPageClient` changes

- New state `giftPots: Record<string, TGiftPotView | null>` seeded from
  `initialItems[].giftPot`.
- Handlers mirroring the wishlist-pot ones, per wish id:
  - `handleGiftPotCreated(wishId, creatorId, creatorName)` — seed a fresh view
  - `handleContributeGiftPot(wishId, delta)` / `…Error` / `…Removed` —
    optimistic patch of `totalContributed`, `myContribution`,
    `participantCount`, `isFunded`
  - on an `isFunded` change, also patch `items[wishId].status`
    (`wanted` ⇄ `funded`)
  - `handleGiftPotRefreshed(wishId, view)` — replace from a server response
- Pass everything down through `views/wishlist` → `WishCard` (thread the new
  props alongside the existing reserve/purchase ones).

## i18n (`shared/i18n/messages/{fr,en}.json`)

New namespaces: `giftPot`, `createGiftPotModal`, `contributeGiftPotModal`
(copy drafted from the approved design canvas). Add `statusFunded` to `wishCard`
and to any other status-label map found in the audit.

## Testing

No test runner in this repo. **Gate: `npm run build`** (lint is broken — see
`project_lint_broken` memory). Manual QA checklist:

1. Priced `wanted` wish, invited guest → "Ouvrir une cagnotte" link visible;
   owner sees nothing; guest on a wish with no price sees no link.
2. Create pot → accordion appears, `Réserver` gone.
3. Contribute; collapsed view shows bar + %.
4. Contributions cross the price → badge "Financé", status `funded`, no buy
   buttons; second contribution still accepted (overfunding).
5. Reduce own pledge below the goal → back to `wanted`, `Réserver` returns.
6. Organiser on a funded pot → *Marquer comme acheté* → status `purchased`,
   pot panel still shows "Objectif atteint".
7. Owner: never sees the pot, the `funded`/`purchased` badge, or a funded
   filter bucket.
8. `reserved` wish → no pot affordance; existing reserve/cancel/mark-purchased
   flow unchanged.
9. Wishlist-level pot (`PotCard`) still works end to end.

## Out of scope

Real payments; notifications; editing the goal; pots on `proposed` wishes;
migrating wishlist-level pots; concurrency hardening beyond the existing
non-atomic list pattern.
