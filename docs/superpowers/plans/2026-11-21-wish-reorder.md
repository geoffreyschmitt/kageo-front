# Wish Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a wishlist owner reorder wishes inside "Most wanted" and "All ideas" through a "Reorder" mode, with guests seeing the owner's order.

**Architecture:** One stored id list per wishlist (`wishlist:{id}:order`), written by a new owner-only `PUT /api/wishlist/[id]/order` under `wishlistLock`. Pure ordering helpers in `shared/lib/wishOrder.ts` are used by the server page, the GET route and the client view. "Manual order" becomes a sort option and the default. A new `features/ReorderWishes` renders compact draggable rows (`@dnd-kit`) and the view swaps to it while reordering.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Vercel KV, next-intl, Vitest (`createFakeKv`), Playwright, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.

**Spec:** `docs/superpowers/specs/2026-11-21-wish-reorder-design.md`

## Global Constraints

- Use `npm`, never `pnpm`; prefix shell commands with `rtk` (e.g. `rtk git commit`); on Windows use PowerShell `Move-Item`/`Rename-Item`, not `mv`.
- FSD: lower layers never import from higher ones. Imports use `@/*`. Use navigation helpers from `shared/i18n/navigation.ts`, not `next/link`.
- Every user-visible string goes in BOTH `src/shared/i18n/messages/fr.json` and `en.json`, namespace `wishlist`.
- Wishlist read-modify-write goes through `withLock(wishlistLock(id), …)` and re-reads inside the lock (`shared/lib/kvLock.ts`). Writes rate-limited with `limitWrite(request, userId, 'write')`.
- KV key: `wishlist:{id}:order` (JSON array of wish ids). Deleting a wishlist must delete it (`wishlistKeys` in `shared/lib/kvCascade.ts`).
- Owner only; guests never reorder; no reordering in history or of proposed wishes; no cross-section drag that changes priority.
- Existing wishlists with no stored order must render exactly as today (newest first).
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Work on branch `feat/wish-reorder` (not `master`).
- `npm run build` is the verification gate; `npm test` and `npm run lint` (0 errors) must pass.
- Update `docs/architecture.md` and `docs/roadmap.md` in the same change.

## Review Focus

- A wish deleted after the order was saved: its stale id must not break sorting or saving (ignored on read, pruned on write).
- A wish added in another tab between loading and saving: omitted from the request, so it must be kept (appended), not rejected.
- Save fails (500/network): the view rolls back to the previous order and shows an error toast; no half-state.
- Non-owner or signed-out caller, or an id that is not in this wishlist, or duplicate ids: 403/401/400, nothing written.
- A wish's priority changes after reordering: it keeps its relative position in the global order; "Clear filters"/default view returns to Manual order for guests who chose another sort.

---

### Task 1: Ordering helpers

**Files:**
- Create: `src/shared/lib/wishOrder.ts`
- Test: `src/shared/lib/wishOrder.test.ts`

**Interfaces:**
- Produces:
  - `sortByStoredOrder<T extends { id: string; createdAt?: string }>(wishes: T[], order: string[] | null | undefined): T[]` — wishes absent from `order` first (newest `createdAt` first, missing date last among them), then the listed ones by index. Stale ids in `order` ignored. Returns a new array.
  - `resolveOrder(requested: string[], wishIds: string[], currentOrder: string[] | null): string[] | null` — `null` if `requested` has duplicates or any id not in `wishIds`. Otherwise `requested` followed by the ids of `wishIds` it omitted, those ordered as they appear in `sortByStoredOrder` of the existing wishes by `currentOrder` (use `currentOrder` index, unlisted ones last in `wishIds` order). Never contains ids outside `wishIds` (prunes stale).
  - `replaceSectionOrder(allIds: string[], sectionIds: string[]): string[]` — the slots in `allIds` held by members of `sectionIds` are refilled, in slot order, with `sectionIds` in its new order; other ids stay put. `sectionIds` must be a permutation of the members it names.
  - `moveToTop(ids: string[], id: string): string[]` — returns a copy with `id` first; unchanged copy if `id` absent.

- [ ] **Step 1: Create branch.** `rtk git checkout -b feat/wish-reorder`

- [ ] **Step 2: Write failing tests** in `wishOrder.test.ts`:
  - `sortByStoredOrder`: with `order=['b','a']` and wishes a(2026-01-01), b(2026-01-02), c(2026-01-03), d(2026-01-04) → ids `['d','c','b','a']` (unlisted c,d newest first, then b, a). With `order=null` → `['d','c','b','a']`. With stale `order=['zzz','a']` → `['d','c','b','a']` (zzz ignored; unlisted first, then a… so exact assertion: `['d','c','b','a']`). Does not mutate input.
  - `resolveOrder(['b','a'], ['a','b','c'], ['c','a','b'])` → `['b','a','c']`; duplicates `['a','a']` → `null`; unknown `['x']` → `null`; stale ids in `currentOrder` never appear in output; `resolveOrder([], ['a','b'], null)` → `['a','b']`.
  - `replaceSectionOrder(['a','b','c','d'], ['d','b'])` → `['a','d','c','b']`; empty section → unchanged.
  - `moveToTop(['a','b','c'],'c')` → `['c','a','b']`; absent id → `['a','b','c']`.

- [ ] **Step 3: Run** `npm test -- wishOrder` → FAIL (module not found).

- [ ] **Step 4: Implement the four functions** in `wishOrder.ts` per the signatures above. Use `Date.parse` for `createdAt` (NaN → 0).

- [ ] **Step 5: Run** `npm test -- wishOrder` → PASS.

- [ ] **Step 6: Commit** `rtk git add src/shared/lib/wishOrder.ts src/shared/lib/wishOrder.test.ts` then `rtk git commit -m "feat(wishlist): ordering helpers for manual wish order"`.

---

### Task 2: Order API route, cascade, server reads

**Files:**
- Create: `src/app/api/wishlist/[id]/order/route.ts`
- Test: `src/app/api/wishlist/[id]/order/route.test.ts`
- Modify: `src/shared/lib/kvCascade.ts` (`wishlistKeys`)
- Modify: `src/app/api/wishlist/[id]/route.ts` (GET returns wishes sorted by stored order)
- Modify: `src/app/[locale]/wishlist/[id]/page.tsx` (read the key, pass `initialOrder`)
- Modify: `docs/architecture.md` (KV table + routes list)

**Interfaces:**
- Consumes: `resolveOrder`, `sortByStoredOrder` from Task 1.
- Produces: `PUT /api/wishlist/[id]/order` body `{ order: string[] }` → 200 `{ order: string[] }`; 401 no session; 403 not owner; 404 unknown wishlist; 400 invalid (not an array of strings, duplicates, unknown ids); 409/busy via `busyResponse()` on lock timeout. Server page passes prop `initialOrder: string[]` (empty array when no key) to `WishlistPageClient`.

- [ ] **Step 1: Write failing tests** in `route.test.ts`, modelled on `src/app/api/wishlist/contribute/route.test.ts` (same `vi.mock` setup, `createFakeKv({ latency: true })`, `signInAs`, `jsonRequest(body, 'PUT')`). Seed `wishlist:L` `{id:'L', ownerId:'owner'}`, `wishlist:L:wishes` set with `a,b,c`. Call `PUT(req, { params: Promise.resolve({ id: 'L' }) })`. Tests:
  - `401 signed out`, `403 for a non-owner` and nothing written to `wishlist:L:order`, `404 unknown wishlist`.
  - `400 for duplicate ids`, `400 for an id not in the wishlist`, `400 when order is not an array`.
  - `saves the order` → 200, `await fake.get('wishlist:L:order')` equals `['c','a','b']` for request `['c','a','b']`.
  - `keeps a wish omitted from the request` (`['b']` → stored `['b','a','c']`).
  - `prunes ids of deleted wishes`: seed stored order `['gone','a']`, request `['b']` → stored has no `'gone'`.
  - `two concurrent saves leave one valid permutation` (use `runAs`; both orders are permutations of a,b,c and the stored value equals one of the two requests).

- [ ] **Step 2: Run** `npm test -- order/route` → FAIL.

- [ ] **Step 3: Implement `PUT`** in `route.ts`: wrapper `PUT(request, context)` with `withLock(wishlistLock(id), () => inner…)` and `LockTimeoutError → busyResponse()` exactly like `PUT` in `src/app/api/wishlist/[id]/route.ts`. Inner: session → `limitWrite` → load wishlist → owner check → parse/validate body → `smembers` wish ids → `resolveOrder(order, wishIds, await kv.get(order key))` → `null` ⇒ 400 → `kv.set` the key → return `{ order }`.

- [ ] **Step 4: Add `` `wishlist:${wishlistId}:order` `` to `wishlistKeys`** in `kvCascade.ts`. If an existing test enumerates `wishlistKeys`, update its expectation.

- [ ] **Step 5: In GET** (`[id]/route.ts`) read `wishlist:${id}:order` and return `wishes` run through `sortByStoredOrder` (apply after masking). **In `page.tsx`** read the same key (`(await kv.get<string[]>(…)) ?? []`) and pass it to `WishlistPageClient` as `initialOrder` (prop added in Task 3; add the prop to its type now with default `[]` so this compiles).

- [ ] **Step 6: Run** `npm test` → PASS (all suites).

- [ ] **Step 7: Docs.** Add `wishlist:{id}:order` (value: wish ids array, owner's manual order) to the KV table in `docs/architecture.md` and `PUT /api/wishlist/[id]/order` to the routes section.

- [ ] **Step 8: Commit** `rtk git commit -m "feat(wishlist): persist owner wish order via PUT /order"` (add the files above).

---

### Task 3: Manual order as the default sort, optimistic save

**Files:**
- Modify: `src/shared/api/wishlist/index.ts` (export), Create: `src/shared/api/wishlist/reorderWishes.ts`
- Modify: `src/widgets/WishFilterBar/WishFilterBar.tsx` (`TSortBy`, option, `isOwner` prop)
- Modify: `src/views/wishlist/wishlist.tsx` (props `order`, `onReorder`; manual sort; defaults)
- Modify: `src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx` (`order` state, `handleReorder`)
- Modify: `src/shared/i18n/messages/fr.json`, `en.json`
- Test: `src/views/wishlist/manualOrder.test.ts` (pure logic only, see Step 1)

**Interfaces:**
- Consumes: `sortByStoredOrder` (Task 1), `initialOrder` prop (Task 2).
- Produces:
  - `reorderWishes(wishlistId: string, order: string[]): Promise<{ order: string[] }>` in `shared/api/wishlist/reorderWishes.ts` (`PUT /api/wishlist/${wishlistId}/order`, `assertOk`, same style as `deleteWishlist.ts`).
  - `TSortBy = 'manual' | 'name' | 'price' | 'date'`. Select option value `'manual'` (labels `sortManualOwner` / `sortManualGuest`) first in `SORT_OPTIONS`; direction ignored for it. New required prop `isOwner: boolean` on `WishFilterBar`.
  - `Wishlist` view props: `order: string[]`, `onReorder?: (order: string[]) => Promise<void> | void`.
  - `WishlistPageClient`: `handleReorder(next: string[])` sets `order` optimistically, calls `reorderWishes`, on failure restores the previous order and `toast(t('reorderSaveError'), 'error')`.

- [ ] **Step 1: Failing test.** Extract the view's list derivation if needed so it is testable without rendering; otherwise test through `sortByStoredOrder`. Minimal required assertions in `manualOrder.test.ts`: with `sortBy='manual'` and `order=['b','a']`, section partition (`priority==='high' && status!=='purchased'` vs rest) of items a(high), b(low), c(low, newest) yields most-wanted `['a']` and regular `['c','b']`. (Export a small pure `partitionWishes(items, order)` from the view folder if that is the easiest seam.) Run → FAIL.

- [ ] **Step 2: Implement** `reorderWishes.ts`, export it from `shared/api/wishlist/index.ts`.

- [ ] **Step 3: Filter bar.** Add the `'manual'` type and option; `sortValue` is `'manual'` when `sortBy==='manual'`; label from `isOwner`. Add copy: `wishlist.sortManualOwner` = FR "Mon ordre" / EN "My order"; `wishlist.sortManualGuest` = FR "Ordre de {ownerName}"… use no placeholder: FR "Ordre du créateur" / EN "Owner's order".

- [ ] **Step 4: View.** Default `sortBy` state `'manual'`; `isDefaultView` and `resetFilters` use `'manual'`. In `compareItems`, `'manual'` falls back to newest-first (used for the proposed list); in `filteredAndSortedItems`, when `sortBy==='manual'` use `sortByStoredOrder(filtered, order)` instead of `.sort(compareItems)`. Pass `isOwner={userIsOwner}` to `WishFilterBar`.

- [ ] **Step 5: Page client.** `const [order, setOrder] = useState<string[]>(initialOrder)`; implement `handleReorder`; pass `order` and `onReorder={handleReorder}` to the view. Add FR/EN `reorderSaveError` ("Impossible d'enregistrer l'ordre. Réessayez." / "Couldn't save the order. Please try again.").

- [ ] **Step 6: Verify** `npm test` PASS, `npm run build` succeeds. Manually: open a wishlist with the dev server — default view unchanged (newest first); sort dropdown shows the manual option first.

- [ ] **Step 7: Commit** `rtk git commit -m "feat(wishlist): manual order sort and optimistic save wiring"`.

---

### Task 4: Reorder mode UI

**Files:**
- Modify: `package.json`/`package-lock.json` via `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Create: `src/features/ReorderWishes/index.ts`, `src/features/ReorderWishes/model.ts`, `src/features/ReorderWishes/ui/ReorderSection.tsx`, `src/features/ReorderWishes/ui/ReorderSection.module.css`
- Test: `src/features/ReorderWishes/model.test.ts`
- Modify: `src/views/wishlist/wishlist.tsx` (+ `wishlist.module.css` for the toolbar button)
- Modify: `fr.json`, `en.json`

**Interfaces:**
- Consumes: `replaceSectionOrder`, `moveToTop` (Task 1); view props `order`, `onReorder` (Task 3).
- Produces:
  - `useReorderModel(params: { allIds: string[]; onSave: (order: string[]) => Promise<void> | void }): { isReordering: boolean; draft: string[]; start(): void; cancel(): void; done(): Promise<void>; moveSection(sectionIds: string[]): void; toTop(id: string): void }` in `model.ts`. `allIds` is the current effective global order of non-proposed wishes; `draft` is the working global order; `moveSection(sectionIds)` = `draft = replaceSectionOrder(draft, sectionIds)`; `toTop(id)` = `draft = moveToTop(draft, id)` (top of the global list, which is the top of its section too); `done()` calls `onSave(draft)` then leaves the mode, unless `draft` equals `allIds` (then just leaves).
  - `<ReorderSection title: string; items: TWishCard[]; onChange(sectionIds: string[]): void; onToTop(id: string): void />` rendering rows (grip handle button `aria-label` = `t('reorderHandle', {name})`, thumbnail, name, "to top" button) inside `DndContext` + `SortableContext` (`verticalListSortingStrategy`), with `PointerSensor` (activation distance 4), `TouchSensor` and `KeyboardSensor` (`sortableKeyboardCoordinates`); `onDragEnd` uses `arrayMove` and calls `onChange`.

- [ ] **Step 1: Failing tests** for the hook (`renderHook` is unavailable if `@testing-library/react` is not installed; if so extract the draft transitions into pure functions in `model.ts` and test those): `toTop` puts the id first; `moveSection` leaves other-section ids in place; `done` calls `onSave` once with the draft, and does not call it when unchanged; `cancel` restores `allIds`. Run → FAIL.

- [ ] **Step 2: Install** `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`; confirm `npm run build` still passes with no peer-dependency error for React 19 (if npm reports one, report it rather than forcing).

- [ ] **Step 3: Implement** `model.ts` and `ReorderSection` per Interfaces. Styling with existing tokens (`shared/styles/variables.css`, `theme.css`), min 44px touch targets, visible focus, dark mode via tokens. Respect `prefers-reduced-motion` (no drag animation when set).

- [ ] **Step 4: Wire into the view.** Show a "Reorder" button in the toolbar area above the sections when `userIsOwner && !isHistory && reorderable.length >= 2`, where `reorderable` = non-proposed items. Entering calls `start()`, `resetFilters()` and hides `WishFilterBar` and the normal grids; render two `ReorderSection`s (titles `mostWantedTitle` and `allIdeas`, the latter only when non-empty) built from `sortByStoredOrder(reorderable, draft)` partitioned by the same rule as Task 3, plus "Done" / "Cancel" buttons. Copy (`wishlist` namespace): `reorder` FR "Réorganiser" / EN "Reorder"; `reorderDone` "Terminé" / "Done"; `reorderCancel` "Annuler" / "Cancel"; `reorderMoveToTop` "Tout en haut" / "Move to top"; `reorderHandle` "Déplacer {name}" / "Move {name}"; `reorderHint` "Glissez pour réordonner, ou placez en haut." / "Drag to reorder, or move to top."

- [ ] **Step 4b: Verify.** `npm run build`, `npm run lint` (0 errors), `npm test`. Then in the dev server at phone width: enter Reorder, drag with mouse and with keyboard (space, arrows, space), "Move to top", Done persists after reload, Cancel discards.

- [ ] **Step 5: Commit** `rtk git commit -m "feat(wishlist): reorder mode with drag handles and move to top"`.

---

### Task 5: End-to-end test and docs

**Files:**
- Create: `e2e/wish-reorder.spec.ts`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Failing spec** modelled on an existing spec in `e2e/` (reuse its sign-in/seed helpers). Owner creates a wishlist with three wishes (A, B, C → newest first shows C, B, A), enters Reorder, clicks "Move to top" on A, clicks Done, reloads → order is A, C, B; then a signed-out/guest visit to the same list shows A, C, B and no "Reorder" button; the owner sees the "Reorder" button.

- [ ] **Step 2: Run** `npm run test:e2e -- wish-reorder` → expect PASS once Tasks 1–4 are in; if it fails, fix the product code, not the test.

- [ ] **Step 3: Roadmap.** Move/add "Reorder wishes" as done in `docs/roadmap.md` under the current phase.

- [ ] **Step 4: Final verification:** `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e` all pass.

- [ ] **Step 5: Commit** `rtk git commit -m "test(wishlist): e2e for wish reordering; update roadmap"`.
