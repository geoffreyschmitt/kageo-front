# Safe-bet gifts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user keep a standing list of "safe bet" gift ideas (wine, books, MTG boosters) that appears on every wishlist they share, with an owner-hidden comment thread per entry.

**Architecture:** Entries live in one KV value per owner (`user:{id}:safeBets`, a JSON array whose order is the display order). Owner CRUD goes through `/api/safe-bets`. Guests never call a list endpoint: the server-rendered wishlist page reads the owner's entries and comment counts, and only the comment thread is an API (`/api/wishlist/{id}/safe-bets/{entryId}/comments`), authorised by `getWishlistAccess` on the wishlist the guest is looking at. Comments reuse the existing `TComment`, `CommentsSection` and `postComment`/`getComments`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vercel KV (in-memory fake in tests), next-intl, Vitest, Playwright, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-10-22-safe-bet-gifts-design.md`

**Branch:** start from `master` (`git switch -c feat/safe-bets master`); `feat/wish-import` is unmerged and unrelated. The roadmap places this in the **Open** phase, so do not merge before the Launch blockers unless the user says so.

## Global Constraints

- Use `npm`, never `pnpm`. Verification gate: `npm run build` (type-checks everything); also `npm test` and `npm run lint` (0 errors).
- FSD: lower layers never import higher ones. Business logic in `features/<Name>/model.ts`, UI in `features/<Name>/ui/`, domain types in `entities/`, fetch wrappers in `shared/api/<domain>/`. Imports use `@/*`.
- Every user-visible string goes in **both** `src/shared/i18n/messages/fr.json` and `en.json`. Use `shared/i18n/navigation.ts`, not `next/link`.
- Surprise is sacred: the owner never reads or writes safe-bet comments, nor sees comment counts (403 on the API, no counter in the UI).
- Read-modify-write of the entries array goes through `withLock(safeBetsLock(userId), ...)` and re-reads inside the lock. Multi-key deletes go through `kv.multi()`.
- Rate limiting: comment writes use the `comment` rule (`limitWrite(request, userId, 'comment')`); owner writes use `write`.
- Tap targets at least 44px; readable on a 375px phone for a signed-out guest.
- No new env vars, no new dependencies, free tier (no paywall), no reserving/"taken" state, no per-wishlist toggle.
- Entry fields, from the spec: `title` (required), `description` (optional free text), `imageUrl` (optional pasted URL with preview, no upload).
- Limits (builder's calls, not in the spec; fixed here so tasks agree): title 1-80 chars after trim, description at most 500, `imageUrl` at most 2048 and `http:`/`https:` only, at most 30 entries per user, comment text 2000 (existing).

## Review Focus

Spec-implied conditions no obvious happy-path test covers. Each is pinned by a named test in the task that owns it.

1. A comment thread requested through a wishlist that does not belong to the entry's owner (wrong `entryId` for that wishlist) must answer 404, never leak another owner's thread. (Task 3)
2. A stranger on a private wishlist, and the owner on their own wishlist, must get 403 on read and write. (Task 3)
3. Hostile or sloppy entry input: whitespace-only title, `javascript:` or `data:` image URL, 10 000-character fields, 31st entry. (Task 1, Task 2)
4. Two simultaneous adds at the cap or at once must not lose an entry or exceed 30. (Task 2)
5. Account deletion must remove the owner's entries and their threads, and the leaving user's comments on other people's entries. Deleting an entry must delete its thread. (Tasks 2 and 4)

---

### Task 1: Entity types, validation and KV helpers

**Files:**
- Create: `src/entities/safeBet/model/safeBet.types.ts`, `src/entities/safeBet/lib/validateSafeBet.ts`, `src/entities/safeBet/index.ts`
- Create: `src/shared/lib/safeBets.ts`
- Modify: `src/shared/lib/kvLock.ts` (add `safeBetsLock`), `src/shared/lib/kvCascade.ts` (add `safeBetKeys`)
- Test: `src/entities/safeBet/lib/validateSafeBet.test.ts`

**Interfaces:**
- Produces:
  - `type TSafeBet = { id: string; title: string; description?: string; imageUrl?: string; createdAt: string }`
  - `type TSafeBetInput = { title?: unknown; description?: unknown; imageUrl?: unknown }`
  - `const SAFE_BET_LIMITS = { title: 80, description: 500, imageUrl: 2048, maxEntries: 30 } as const`
  - `validateSafeBetInput(input: TSafeBetInput): { ok: true; value: { title: string; description?: string; imageUrl?: string } } | { ok: false; error: 'title' | 'description' | 'imageUrl' }` (trims; empty optional fields become absent)
  - `safeBetsLock(userId: string): string` returns `` `user:${userId}:safebets` ``
  - `safeBetKeys(entryId: string): string[]` returns `` [`safebet:${entryId}:comments`] ``
  - `getSafeBets(userId: string): Promise<TSafeBet[]>` reads `user:{userId}:safeBets` (empty array when absent)
  - `safeBetCommentsKey(entryId: string): string`

- [ ] **Step 1: Write failing tests** in `validateSafeBet.test.ts`: `'  Wine  '` gives title `'Wine'`; whitespace-only and non-string title give `{ok:false,error:'title'}`; 81-char title fails `title`; 501-char description fails `description`; `''` description/imageUrl are dropped from `value`; `'javascript:alert(1)'`, `'data:text/html,x'`, `'ftp://x.io/a.png'`, and a 2049-char URL fail `imageUrl`; `'https://x.io/a.png'` passes.
- [ ] **Step 2: Run** `npm test -- src/entities/safeBet` and confirm FAIL (module not found).
- [ ] **Step 3: Implement** the types, `validateSafeBetInput` (reuse `isValidUrl` from `@/shared/lib/isValidUrl` plus a protocol check), `index.ts` re-exports, `safeBetsLock`, `safeBetKeys`, `getSafeBets`, `safeBetCommentsKey`.
- [ ] **Step 4: Run** `npm test -- src/entities/safeBet` and confirm PASS.
- [ ] **Step 5: Commit** `feat(safe-bets): entry type, validation and KV helpers`.

### Task 2: Owner CRUD API

**Files:**
- Create: `src/app/api/safe-bets/route.ts` (GET list, POST create), `src/app/api/safe-bets/[entryId]/route.ts` (PATCH edit, DELETE), `src/app/api/safe-bets/reorder/route.ts` (PUT)
- Test: `src/app/api/safe-bets/safeBets.test.ts` (mock `@vercel/kv`, `next-auth` and `authOptions` exactly as `src/app/api/comments.test.ts` does; use `createFakeKv`, `signInAs`, `jsonRequest`, `bodyOf`)

**Interfaces:**
- Consumes: Task 1 helpers; `withLock`, `busyResponse`, `LockTimeoutError` from `@/shared/lib/kvLock`; `limitWrite(request, userId, 'write')`.
- Produces (all need a session, else 401):
  - `GET /api/safe-bets` returns `200 TSafeBet[]` for the caller.
  - `POST /api/safe-bets` body `TSafeBetInput` returns `201 TSafeBet` (new uuid, `createdAt` ISO, appended last); `400 {message}` on invalid input; `409` when already 30 entries.
  - `PATCH /api/safe-bets/{entryId}` body `TSafeBetInput` returns `200 TSafeBet` (full replace of title/description/imageUrl; `id`/`createdAt` kept); `404` when the caller has no such entry.
  - `DELETE /api/safe-bets/{entryId}` returns `200 {ok:true}`; removes the entry and `safebet:{entryId}:comments` in one `kv.multi()`; `404` if absent.
  - `PUT /api/safe-bets/reorder` body `{ ids: string[] }` returns `200 TSafeBet[]`; `400` unless `ids` is exactly a permutation of the current entry ids.

- [ ] **Step 1: Write failing tests**: unauthenticated 401 on each verb; create then list returns it with trimmed fields; users only see their own entries; invalid inputs from Review Focus 3 answer 400 (whitespace title, `javascript:` image, 10 000-char description); edit keeps `id`/`createdAt`; editing another user's entry id is 404; delete removes the entry and its pre-seeded `safebet:{id}:comments` list; reorder with a valid permutation changes order, with a missing/extra/duplicate id answers 400; the 31st POST answers 409; **race**: with `createFakeKv({ latency: true })`, 10 concurrent POSTs via `runAs` produce 10 stored entries, and 35 concurrent POSTs end with exactly 30 (some 409) and no lost writes.
- [ ] **Step 2: Run** `npm test -- src/app/api/safe-bets` and confirm FAIL.
- [ ] **Step 3: Implement** the three route files. Every read-modify-write runs inside `withLock(safeBetsLock(userId), ...)` and re-reads `getSafeBets` there; map `LockTimeoutError` to `busyResponse()` as the other routes do (see `src/app/api/wish/reserve/route.ts`). Store with `kv.set(`user:${userId}:safeBets`, entries)`.
- [ ] **Step 4: Run** `npm test -- src/app/api/safe-bets` and confirm PASS.
- [ ] **Step 5: Commit** `feat(safe-bets): owner CRUD API`.

### Task 3: Guest comment thread API

**Files:**
- Create: `src/app/api/wishlist/[id]/safe-bets/[entryId]/comments/route.ts`
- Modify: `src/shared/api/comment/getComments.ts` and `postComment.ts` (extend `TCommentTarget`)
- Test: `src/app/api/safeBetComments.test.ts` (same mocking as `comments.test.ts`)

**Interfaces:**
- Consumes: `getWishlistAccess`, `getSafeBets`, `safeBetCommentsKey`, `limitWrite(..., 'comment')`, `TComment`.
- Produces:
  - `GET` and `POST` on `/api/wishlist/{id}/safe-bets/{entryId}/comments`, same payloads and codes as `wishlist/[id]/comments/route.ts` (GET `200 TComment[]`; POST `{text}` returns `201 TComment`, text trimmed, cut at 2000, `400` when empty, `401` when signed out on POST).
  - Order of checks: wishlist missing `404`; `isOwner || !canView` `403`; then entry must be in `getSafeBets(wishlist.ownerId)` else `404`.
  - `TCommentTarget` gains `{ type: 'safeBet'; wishlistId: string; entryId: string }`; both `urlFor` helpers map it to the path above. Do not duplicate `urlFor`: export one from `getComments.ts` and import it in `postComment.ts`.

- [ ] **Step 1: Write failing tests**, reusing the `describe.each` shape of `comments.test.ts` where it fits: owner gets 403 on GET and POST (Review Focus 2); anonymous can GET on a public wishlist but gets 401 on POST; a guest posts and another guest reads it; empty text 400; 3000-char text stored as 2000; private wishlist closed to a stranger (403) and open to an invited email; `entryId` that is not in the wishlist owner's entries answers 404, including an entry id that belongs to a *different* owner (Review Focus 1); comment rate limit gives 429 after the `comment` limit like `rateLimitRoutes.test.ts` does.
- [ ] **Step 2: Run** `npm test -- src/app/api/safeBetComments` and confirm FAIL.
- [ ] **Step 3: Implement** the route (copy the structure of `wishlist/[id]/comments/route.ts`, add the entry check), `rpush` to `safeBetCommentsKey(entryId)`; extend `TCommentTarget` and `useCommentsModel`'s `targetKey` (`src/features/Comments/model.ts`) so the `safeBet` target keys on `entryId`.
- [ ] **Step 4: Run** `npm test -- src/app/api` and confirm PASS (existing comment tests still green).
- [ ] **Step 5: Commit** `feat(safe-bets): guest comment threads`.

### Task 4: Account purge and data export

**Files:**
- Modify: `src/app/api/user/me/purgeUser.ts`, `src/app/api/user/export/route.ts`
- Test: `src/app/api/user/me/purgeUser.test.ts` (extend), `src/app/api/user/account.test.ts` (extend export assertion)

**Interfaces:**
- Consumes: `safeBetKeys`, `getSafeBets`, `scanKeys`, `queueListReplace`.

- [ ] **Step 1: Write failing tests**: purging a user with 2 entries (each with a seeded thread) deletes `user:{id}:safeBets` and both `safebet:*:comments` keys; purging a user who commented on *another* user's entry removes only their comments from that thread and keeps the others'; the export JSON gains `safeBets: TSafeBet[]` (empty array when none) and contains no comments.
- [ ] **Step 2: Run** `npm test -- src/app/api/user` and confirm FAIL.
- [ ] **Step 3: Implement.** In `purgeUser`: add `safeBets: Set<string>` (entry ids read via `getSafeBets(userId)`) to `TOwned`; extend `dropComments` to also scan `safebet:*:comments`, skipping keys whose id is in `owned.safeBets`; in the final per-user transaction delete `user:${userId}:safeBets` and every `safeBetKeys(id)`. Export adds `safeBets`.
- [ ] **Step 4: Run** `npm test -- src/app/api/user` and confirm PASS.
- [ ] **Step 5: Commit** `feat(safe-bets): purge and export`.

### Task 5: Owner editor on the profile page

**Files:**
- Create: `src/shared/api/safeBet/{index,getSafeBets,createSafeBet,updateSafeBet,deleteSafeBet,reorderSafeBets}.ts`
- Create: `src/features/ManageSafeBets/{index.ts,model.ts,ui/ManageSafeBets.tsx,ui/ManageSafeBets.module.css}`
- Modify: `src/views/profile/ui/ProfilePage.tsx` (render the feature as its own `Panel` section), `src/shared/i18n/messages/fr.json` and `en.json` (new `safeBets` namespace)
- Test: `src/features/ManageSafeBets/model.test.ts` (pure logic only, e.g. move-up/move-down ordering helper and form-to-input mapping)

**Interfaces:**
- Consumes: Task 2 routes via `assertOk` from `@/shared/api/assertOk`; `TSafeBet`, `SAFE_BET_LIMITS`, `validateSafeBetInput`.
- Produces: `useManageSafeBetsModel(): { entries: TSafeBet[]; isLoading: boolean; error: string | null; add(input): Promise<void>; update(id, input): Promise<void>; remove(id): Promise<void>; move(id, dir: -1 | 1): Promise<void> }`; `<ManageSafeBets />` (no props).

- [ ] **Step 1: Write failing test** for the pure helper `moveId(ids: string[], id: string, dir: -1 | 1): string[]` (swaps neighbours, clamps at both ends, returns a new array).
- [ ] **Step 2: Run** `npm test -- src/features/ManageSafeBets` and confirm FAIL.
- [ ] **Step 3: Implement** wrappers, the model hook (optimistic-free: await the API, then replace `entries` from the response), and the UI: a list with edit/delete/up/down buttons and an add/edit form (title, description textarea, image URL with a preview and load-error state like `WishForm`). Show the owner a short hint that guests will see these on every shared list and that the owner never sees comments. Buttons are at least 44px. Rate-limit toast comes from `assertOk`. Add all strings to both locale files.
- [ ] **Step 4: Run** `npm test -- src/features/ManageSafeBets`, then `npm run build` and expect no type errors.
- [ ] **Step 5: Commit** `feat(safe-bets): owner editor on the profile page`.

### Task 6: Guest section on shared wishlists

**Files:**
- Create: `src/widgets/SafeBetsSection/{index.ts,SafeBetsSection.tsx,SafeBetsSection.module.css}`
- Modify: `src/app/[locale]/wishlist/[id]/page.tsx` (load entries + counts), `src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx` (render widget), `src/shared/i18n/messages/fr.json` and `en.json`
- Test: `e2e/safe-bets.spec.ts` (modelled on `e2e/guest-view.spec.ts`)

**Interfaces:**
- Consumes: `getSafeBets(wishlist.ownerId)`, `kv.llen(safeBetCommentsKey(id))`, `CommentsDrawer` or `CommentsSection` from `@/features/Comments` with `target={{ type: 'safeBet', wishlistId, entryId }}`.
- Produces: `<SafeBetsSection wishlistId={string} entries={(TSafeBet & { commentCount: number })[]} isLoggedIn={boolean} />`. The page passes `[]` when `userIsOwner`, and the widget renders nothing for an empty list.

- [ ] **Step 1: Write the failing e2e spec**: an owner adds "Vin rouge" with a description through the profile page; a signed-out visitor opens the public wishlist and sees the section and entry title; the comment box prompts login; a signed-in guest posts a comment and sees it; the owner reloads their own wishlist and sees no section and no counter.
- [ ] **Step 2: Run** `npm run test:e2e -- safe-bets` and confirm FAIL.
- [ ] **Step 3: Implement** the widget (heading such as "Ideas they'd be happy to receive", entry cards with optional image, title, description as plain text, comment count button opening the thread; logged-out guests see everything except existing comments, matching how `CommentsSection` already behaves) and wire the page: read entries and counts only when `!userIsOwner`, in parallel with the other reads. Description is rendered as plain text (React escaping), not HTML.
- [ ] **Step 4: Run** `npm run test:e2e -- safe-bets` and confirm PASS; check the page at 375px width with touch-size targets.
- [ ] **Step 5: Commit** `feat(safe-bets): guest section on shared wishlists`.

### Task 7: Docs and final verification

**Files:**
- Modify: `docs/architecture.md` (routes table, data-model table, visibility rules, cascade note), `docs/roadmap.md` (move the item to **Done** with the ship date), `CHANGELOG.md` if it carries per-feature entries

- [ ] **Step 1: Update docs.** Routes: `safe-bets`, `safe-bets/[entryId]`, `safe-bets/reorder`, `wishlist/[id]/safe-bets/[entryId]/comments`. Keys: `user:{id}:safeBets` (value, `TSafeBet[]`), `safebet:{entryId}:comments` (list, `TComment`), lock `lock:user:{id}:safebets`. State that safe-bet threads never reach the owner and that purge and export cover them.
- [ ] **Step 2: Verify** with `npm run build`, `npm test`, `npm run lint`, `npm run test:e2e`; all must pass with 0 lint errors. Report any failure with output rather than claiming success.
- [ ] **Step 3: Commit** `docs: safe-bet gifts shipped`.
