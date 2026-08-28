# Gift Pot Per Wish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an invited guest open a money pot on a single priced wish, with the goal fixed at the wish's price, coexisting with the existing wishlist-level pot.

**Architecture:** New KV keys `wish:{id}:pot` and `wish:{id}:contributions` mirroring the wishlist pot. New routes under `/api/wish/`. New `funded` wish status, reconciled server-side from the live contribution total on every contribute write. New dedicated FSD slices (`features/CreateGiftPot`, `features/ContributeGiftPot`, `widgets/GiftPotSection`); the existing wishlist-pot slices are untouched. The pot is a surprise: never fetched or exposed for the wishlist owner.

**Tech Stack:** Next.js App Router (route handlers), `@vercel/kv`, NextAuth v4 (`getServerSession(authOptions)`), `next-intl`, CSS Modules, Feature-Sliced Design.

**Spec:** `docs/superpowers/specs/2026-08-28-gift-pot-per-wish-design.md`

## Global Constraints

- **Package manager:** `npm` (pnpm is not on PATH here). Build gate: `npm run build`.
- **No test runner** in this repo, and `next lint` is broken (Next 16). The only automated gate is `npm run build`. Every task ends with a build + the listed manual checks.
- **FSD layering:** `shared` → `entities` → `features` → `widgets` → `views` → `app`. Never import upward. Internal imports use the `@/*` alias.
- **The pot is a surprise:** no code path may expose a wish's pot, its `funded`/`purchased` status, a "funded" badge, or a funded count to the wishlist owner.
- **Goal is never stored:** it is always read from `wish.price`. A wish with `price <= 0` cannot have a pot.
- **Money is a pledge, not a payment.** All user-facing copy says the organiser collects the money directly. New copy lives in `shared/i18n/messages/{fr,en}.json`; keys in both files must match exactly.
- **Mirror the existing wishlist pot** (`src/app/api/wishlist/pot/*`, `src/app/api/wishlist/contribute/route.ts`, `src/features/CreatePot`, `src/features/ContributePot`, `src/widgets/PotCard`) for structure, naming, error shapes, and the optimistic-update pattern.

---

## File Structure

**Created:**
- `src/app/api/wish/pot/readGiftPot.ts` — server-only role-shaped read helper
- `src/app/api/wish/pot/route.ts` — `GET` (read) + `POST` (create)
- `src/app/api/wish/contribute/route.ts` — `POST` (add pledge) + `PATCH` (replace/remove)
- `src/app/api/wish/pot/reconcileFundedStatus.ts` — pure-ish helper: flip `wanted`⇄`funded` from `(total, price, currentStatus)`
- `src/shared/api/wish/getGiftPot.ts` — client fetch + `TGiftPotView`, `TGiftPotContributor`
- `src/shared/api/wish/createGiftPot.ts` — `POST` client wrapper
- `src/shared/api/wish/contributeGiftPot.ts` — `POST` + `PATCH` client wrappers
- `src/features/CreateGiftPot/` — `model.ts`, `ui/CreateGiftPotButton.tsx`, `ui/CreateGiftPotModal.tsx`, `ui/CreateGiftPotModal.module.css`, `ui/CreateGiftPotModal.types.ts`, `ui/index.ts`, `index.ts`
- `src/features/ContributeGiftPot/` — `model.ts`, `ui/ContributeGiftPotModal.tsx`, `ui/ContributeGiftPotModal.module.css`, `ui/ContributeGiftPotModal.types.ts`, `ui/index.ts`, `index.ts`
- `src/widgets/GiftPotSection/` — `GiftPotSection.tsx`, `GiftPotSection.module.css`, `GiftPotSection.types.ts`, `model.ts`, `index.ts`

**Modified:**
- `src/entities/wish/model/types.ts` — add `'funded'` to `TWishStatus`
- `src/app/api/wish/reserve/route.ts` — refuse to reserve a wish that has a pot
- `src/app/api/wish/mark-purchased/route.ts` — also allow the pot creator to mark a `funded` wish purchased
- `src/widgets/WishCard/WishCard.types.ts` — new props
- `src/widgets/WishCard/WishCard.tsx` — render `GiftPotSection`, gate buttons, `visibleStatus`, status class/label for `funded`
- `src/widgets/WishCard/WishCard.module.css` — `funded` badge style (sage, like purchased)
- `src/app/[locale]/wishlist/[id]/page.tsx` — batch-fetch gift-pot views for non-owners; map `funded`→`wanted` for the owner; `hasActivity`
- `src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx` — `giftPots` state + per-wish handlers, thread props
- `src/views/wishlist/wishlist.tsx` — thread the new props to all `WishCard` call sites; count `funded` as `wanted` in filters/stats/grouping
- `src/widgets/WishCard/index.ts` / `src/widgets/index.ts` — export `TGiftPotView` re-export if needed (only if an import cycle forces it; prefer importing from `shared/api/wish/getGiftPot`)
- `src/shared/i18n/messages/fr.json`, `src/shared/i18n/messages/en.json` — new namespaces + `statusFunded`

---

## Task 1: Add the `funded` wish status

**Files:**
- Modify: `src/entities/wish/model/types.ts:3`
- Modify: `src/widgets/WishCard/WishCard.tsx` (`getStatusClass`, `visibleStatus`, label)
- Modify: `src/widgets/WishCard/WishCard.module.css` (add `.wish-card__status--funded`)
- Modify: `src/shared/i18n/messages/fr.json`, `src/shared/i18n/messages/en.json` (`wishCard.statusFunded`)

**Interfaces:**
- Produces: `TWishStatus` now includes `'funded'`. `WishCard` renders a sage "Financé" / "Funded" badge for `status === 'funded'` and downgrades it to `wanted` when `showOwnerAction` is set.

- [ ] **Step 1: Extend the type**

`src/entities/wish/model/types.ts`:
```ts
export type TWishStatus = 'wanted' | 'purchased' | 'reserved' | 'proposed' | 'funded'
```

- [ ] **Step 2: WishCard — status class**

In `src/widgets/WishCard/WishCard.tsx`, `getStatusClass`:
```ts
case 'funded':
    return styles['wish-card__status--funded']
```

- [ ] **Step 3: WishCard — owner masking**

Change `visibleStatus` (currently line ~90) so `funded` is also hidden from the owner:
```ts
const visibleStatus =
    showOwnerAction && (status === 'reserved' || status === 'purchased' || status === 'funded')
        ? 'wanted'
        : status
```

- [ ] **Step 4: WishCard — label**

`statusLabel` already does `t(\`status${cap(visibleStatus)}\`)`. Add the key:
- `fr.json` → `"wishCard"`: `"statusFunded": "Financé"`
- `en.json` → `"wishCard"`: `"statusFunded": "Funded"`

- [ ] **Step 5: WishCard CSS — badge**

`src/widgets/WishCard/WishCard.module.css`, next to `.wish-card__status--purchased`:
```css
.wish-card__status--funded {
    background: var(--status-purchased-bg);
    color: var(--wc-purch);
    box-shadow: 0 1px 4px rgba(63, 104, 69, 0.15);
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: PASS. TypeScript now knows `'funded'`; no `switch` exhaustiveness errors (the codebase uses string unions, not exhaustive switches).

- [ ] **Step 7: Commit**

```bash
git add src/entities/wish/model/types.ts src/widgets/WishCard/ src/shared/i18n/messages/
git commit -m "feat(gift-pot): add funded wish status + badge"
```

---

## Task 2: Client API layer — types + fetchers

**Files:**
- Create: `src/shared/api/wish/getGiftPot.ts`
- Create: `src/shared/api/wish/createGiftPot.ts`
- Create: `src/shared/api/wish/contributeGiftPot.ts`

**Interfaces:**
- Produces:
  - `type TGiftPotContributor = { name: string; amount: number; lastContributedAt?: string }`
  - `type TGiftPotView = { creatorId?: string; creatorName: string; isCreator?: boolean; goal: number; totalContributed: number; isFunded: boolean; myContribution?: number; participantCount?: number; contributors?: TGiftPotContributor[] }`
  - `getGiftPot(wishId: string): Promise<TGiftPotView | null>` (`404 → null`)
  - `createGiftPot(wishId: string): Promise<{ creatorId: string; creatorName: string; createdAt: string }>`
  - `contributeGiftPot(wishId: string, amount: number): Promise<{ wishId: string; totalContributed: number; isFunded: boolean }>` (POST, `amount > 0`)
  - `setGiftContribution(wishId: string, amount: number): Promise<{ wishId: string; totalContributed: number; myContribution: number; isFunded: boolean }>` (PATCH, `amount >= 0`, `0` removes)

- [ ] **Step 1: `getGiftPot.ts`** — mirror `src/shared/api/wishlist/getPot.ts`:

```ts
export type TGiftPotContributor = { name: string; amount: number; lastContributedAt?: string }

export type TGiftPotView = {
    creatorId?: string
    creatorName: string
    isCreator?: boolean
    goal: number
    totalContributed: number
    isFunded: boolean
    myContribution?: number
    participantCount?: number
    contributors?: TGiftPotContributor[]
}

export const getGiftPot = async (wishId: string): Promise<TGiftPotView | null> => {
    const res = await fetch(`/api/wish/pot?wishId=${encodeURIComponent(wishId)}`)
    if (res.status === 404) return null
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }
    return (await res.json()) as TGiftPotView
}
```

- [ ] **Step 2: `createGiftPot.ts`** — mirror `src/shared/api/wishlist/createPot.ts`, endpoint `/api/wish/pot`, body `{ wishId }`, return `{ creatorId, creatorName, createdAt }`.

- [ ] **Step 3: `contributeGiftPot.ts`** — mirror `src/shared/api/wishlist/contributePot.ts`: `contributeGiftPot` (POST) and `setGiftContribution` (PATCH), endpoint `/api/wish/contribute`, body `{ wishId, amount }`. Return types per the Interfaces block above (both include `isFunded`).

- [ ] **Step 4: Build** — `npm run build` → PASS (files are unused so far; TS still type-checks them).

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/wish/getGiftPot.ts src/shared/api/wish/createGiftPot.ts src/shared/api/wish/contributeGiftPot.ts
git commit -m "feat(gift-pot): client api layer"
```

---

## Task 3: `reconcileFundedStatus` helper

**Files:**
- Create: `src/app/api/wish/pot/reconcileFundedStatus.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `reconcileFundedStatus(currentStatus: string, total: number, goal: number): 'funded' | 'wanted' | null` — returns the new status to write, or `null` when no change is needed.

- [ ] **Step 1: Implement**

```ts
// Decide whether a wish's status must flip because its gift-pot total crossed
// (or dropped back below) the goal. Returns the status to persist, or null when
// nothing should change. Only ever moves between 'wanted' and 'funded' — every
// other status (reserved, purchased, proposed) is left alone.
export const reconcileFundedStatus = (
    currentStatus: string,
    total: number,
    goal: number,
): 'funded' | 'wanted' | null => {
    const reached = goal > 0 && total >= goal
    if (reached && currentStatus === 'wanted') return 'funded'
    if (!reached && currentStatus === 'funded') return 'wanted'
    return null
}
```

- [ ] **Step 2: Build** — `npm run build` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/wish/pot/reconcileFundedStatus.ts
git commit -m "feat(gift-pot): funded-status reconciliation helper"
```

---

## Task 4: `readGiftPotForViewer` server helper

**Files:**
- Create: `src/app/api/wish/pot/readGiftPot.ts`

**Interfaces:**
- Consumes: `TGiftPotView`, `TGiftPotContributor` from `@/shared/api/wish/getGiftPot`; `parseContributions` from `@/app/api/wishlist/pot/readPot`.
- Produces: `readGiftPotForViewer({ wishId, userId }: { wishId: string; userId: string | null }): Promise<TGiftPotView | null>`

- [ ] **Step 1: Implement** — mirror `src/app/api/wishlist/pot/readPot.ts`, keyed by wish, total computed from the list, `goal` from `wish.price`:

```ts
import { kv } from '@vercel/kv'

import type { TGiftPotView, TGiftPotContributor } from '@/shared/api/wish/getGiftPot'
import { parseContributions } from '@/app/api/wishlist/pot/readPot'

type TWishKV = { id: string; wishlistId: string; price: number; status: string }
type TWishlistKV = { id: string; ownerId: string }
type TPotKV = { creatorId: string; creatorName: string; createdAt: string }
type TUserKV = { id: string; email: string; name: string }

// Server-only. Role-shaped read of a wish's gift pot. Shared by
// GET /api/wish/pot and the wishlist page server component so the visibility
// rules live in one place.
//   - wishlist owner            → null (the pot is a surprise)
//   - no pot / no wish / no list → null
//   - any other viewer          → totals + participant count + goal + isFunded
//   - pot creator               → + the nominative contributor list
export const readGiftPotForViewer = async ({
    wishId,
    userId,
}: {
    wishId: string
    userId: string | null
}): Promise<TGiftPotView | null> => {
    const [wish, pot] = await Promise.all([
        kv.get<TWishKV>(`wish:${wishId}`),
        kv.get<TPotKV>(`wish:${wishId}:pot`),
    ])
    if (!wish || !pot) return null

    const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
    if (!wishlist) return null
    if (userId && wishlist.ownerId === userId) return null

    const goal = wish.price ?? 0

    const contributions = parseContributions(
        await kv.lrange<string>(`wish:${wishId}:contributions`, 0, -1),
    )

    const byUser = new Map<string, { amount: number; last: string }>()
    for (const c of contributions) {
        const current = byUser.get(c.userId)
        if (current) {
            current.amount += c.amount
            if (c.contributedAt > current.last) current.last = c.contributedAt
        } else {
            byUser.set(c.userId, { amount: c.amount, last: c.contributedAt })
        }
    }
    const positive = Array.from(byUser.entries()).filter(([, v]) => v.amount > 0)

    const totalContributed = positive.reduce((sum, [, v]) => sum + v.amount, 0)
    const participantCount = positive.length
    const myContribution = userId ? byUser.get(userId)?.amount ?? 0 : 0
    const isCreator = !!userId && pot.creatorId === userId

    const base: TGiftPotView = {
        creatorName: pot.creatorName,
        isCreator,
        goal,
        totalContributed,
        isFunded: goal > 0 && totalContributed >= goal,
        myContribution,
        participantCount,
    }
    if (!isCreator) return base

    const contributors: TGiftPotContributor[] = await Promise.all(
        positive.map(async ([uid, { amount, last }]) => {
            const email = await kv.get<string>(`user:id:${uid}`)
            const user = email ? await kv.get<TUserKV>(`user:${email}`) : null
            return { name: user?.name ?? 'Anonymous', amount, lastContributedAt: last }
        }),
    )
    contributors.sort((a, b) => b.amount - a.amount)

    return { ...base, creatorId: pot.creatorId, contributors }
}
```

- [ ] **Step 2: Build** — `npm run build` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/wish/pot/readGiftPot.ts
git commit -m "feat(gift-pot): readGiftPotForViewer server helper"
```

---

## Task 5: `GET` + `POST /api/wish/pot`

**Files:**
- Create: `src/app/api/wish/pot/route.ts`

**Interfaces:**
- Consumes: `readGiftPotForViewer` (Task 4).
- Produces: `GET /api/wish/pot?wishId=` → `TGiftPotView` or 404. `POST /api/wish/pot` `{ wishId }` → `201 { creatorId, creatorName, createdAt }`.

- [ ] **Step 1: Implement** — mirror `src/app/api/wishlist/pot/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { readGiftPotForViewer } from './readGiftPot'

type TWishKV = { id: string; wishlistId: string; price: number; status: string }
type TWishlistKV = { id: string; ownerId: string }
type TPotKV = { creatorId: string; creatorName: string; createdAt: string }

// GET /api/wish/pot?wishId={id} — role-shaped payload (see readGiftPot.ts)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const wishId = searchParams.get('wishId')
    if (!wishId) {
        return NextResponse.json({ message: 'wishId is required' }, { status: 400 })
    }
    const session = await getServerSession(authOptions)
    const pot = await readGiftPotForViewer({ wishId, userId: session?.user?.id ?? null })
    if (!pot) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(pot)
}

// POST /api/wish/pot — create the pot for a single wish
// Guards: logged in, wish + list exist, not the list owner, invited, price > 0,
// status is 'wanted', no pot yet.
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    try {
        const { wishId } = await request.json()
        if (!wishId) {
            return NextResponse.json({ message: 'wishId is required' }, { status: 400 })
        }

        const wish = await kv.get<TWishKV>(`wish:${wishId}`)
        if (!wish) {
            return NextResponse.json({ message: 'Wish not found' }, { status: 404 })
        }
        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
        if (!wishlist) {
            return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
        }
        if (wishlist.ownerId === session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const userEmail = session.user.email?.toLowerCase()
        if (!userEmail) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }
        const isInvited = await kv.sismember(`wishlist:${wish.wishlistId}:invitees`, userEmail)
        if (!isInvited) {
            return NextResponse.json({ message: 'You must be invited to start a pot' }, { status: 403 })
        }

        if (!(wish.price > 0)) {
            return NextResponse.json({ message: 'This wish has no price' }, { status: 422 })
        }
        if (wish.status !== 'wanted') {
            return NextResponse.json({ message: 'This wish is not available for a pot' }, { status: 409 })
        }

        const now = new Date().toISOString()
        const pot: TPotKV = {
            creatorId: session.user.id,
            creatorName: session.user.name ?? 'Someone',
            createdAt: now,
        }
        const wasSet = await kv.set(`wish:${wishId}:pot`, pot, { nx: true })
        if (!wasSet) {
            return NextResponse.json({ message: 'A pot already exists for this wish' }, { status: 409 })
        }
        return NextResponse.json(pot, { status: 201 })
    } catch (error) {
        console.error('Create gift pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
```

- [ ] **Step 2: Build** — `npm run build` → PASS.

- [ ] **Step 3: Manual check** — `npm run dev`, log in as an invited guest, `POST /api/wish/pot` with a priced wanted wish id (via devtools console `fetch`): expect `201`. Repeat: expect `409`. Try a `price: 0` wish: expect `422`. As the owner: expect `403`. `GET` as owner: `404`; as guest: the view.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/wish/pot/route.ts
git commit -m "feat(gift-pot): GET + POST /api/wish/pot"
```

---

## Task 6: `POST` + `PATCH /api/wish/contribute`

**Files:**
- Create: `src/app/api/wish/contribute/route.ts`

**Interfaces:**
- Consumes: `parseContributions` from `@/app/api/wishlist/pot/readPot`; `reconcileFundedStatus` (Task 3).
- Produces:
  - `POST` `{ wishId, amount>0 }` → `{ wishId, contribution, totalContributed, isFunded }`
  - `PATCH` `{ wishId, amount>=0 }` → `{ wishId, totalContributed, myContribution, isFunded }`

- [ ] **Step 1: Implement** — mirror `src/app/api/wishlist/contribute/route.ts`. Key differences: keyed by wish; total recomputed from the list (not read off a stored field); after every write, call `reconcileFundedStatus` and persist the wish if it returns non-null.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { parseContributions } from '@/app/api/wishlist/pot/readPot'
import { reconcileFundedStatus } from '@/app/api/wish/pot/reconcileFundedStatus'

type TWishKV = { id: string; wishlistId: string; price: number; status: string }
type TWishlistKV = { id: string; ownerId: string; isPublic: boolean }
type TContribution = { userId: string; amount: number; contributedAt: string }

type TCtx = { userId: string; wishId: string; amount: number; wish: TWishKV }

// Shared guards for POST (add) and PATCH (replace). Mirrors the wishlist
// contribute route: logged in, non-owner, public list, pot exists.
// allowZero is true for PATCH — a 0 pledge cancels the caller's participation.
const loadContext = async (
    request: NextRequest,
    { allowZero = false }: { allowZero?: boolean } = {},
): Promise<{ ctx: TCtx } | { error: NextResponse }> => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) }
    }
    const { wishId, amount } = await request.json()
    if (!wishId) {
        return { error: NextResponse.json({ message: 'wishId is required' }, { status: 400 }) }
    }
    const parsedAmount = Number(amount)
    const invalid =
        Number.isNaN(parsedAmount) || parsedAmount < 0 || (!allowZero && parsedAmount <= 0)
    if (invalid) {
        return {
            error: NextResponse.json(
                { message: allowZero ? 'amount must be zero or positive' : 'amount must be a positive number' },
                { status: 400 },
            ),
        }
    }

    const wish = await kv.get<TWishKV>(`wish:${wishId}`)
    if (!wish) {
        return { error: NextResponse.json({ message: 'Wish not found' }, { status: 404 }) }
    }
    const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
    if (!wishlist) {
        return { error: NextResponse.json({ message: 'Wishlist not found' }, { status: 404 }) }
    }
    const pot = await kv.get(`wish:${wishId}:pot`)
    if (!pot) {
        return { error: NextResponse.json({ message: 'No pot has been started for this wish' }, { status: 409 }) }
    }
    if (wishlist.ownerId === session.user.id) {
        return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
    }
    if (!wishlist.isPublic) {
        return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
    }
    return { ctx: { userId: session.user.id, wishId, amount: parsedAmount, wish } }
}

// Recompute the total from the list and flip wanted<->funded if needed.
const reconcile = async (wish: TWishKV): Promise<{ total: number; isFunded: boolean }> => {
    const all = parseContributions(await kv.lrange<string>(`wish:${wish.id}:contributions`, 0, -1))
    const byUser = new Map<string, number>()
    for (const c of all) byUser.set(c.userId, (byUser.get(c.userId) ?? 0) + c.amount)
    const total = Array.from(byUser.values()).filter((v) => v > 0).reduce((s, v) => s + v, 0)

    const next = reconcileFundedStatus(wish.status, total, wish.price ?? 0)
    if (next) {
        await kv.set(`wish:${wish.id}`, { ...wish, status: next, updatedAt: new Date().toISOString() })
    }
    return { total, isFunded: (wish.price ?? 0) > 0 && total >= (wish.price ?? 0) }
}

export async function POST(request: NextRequest) {
    try {
        const loaded = await loadContext(request)
        if ('error' in loaded) return loaded.error
        const { userId, wishId, amount, wish } = loaded.ctx

        const now = new Date().toISOString()
        const contribution: TContribution = { userId, amount, contributedAt: now }
        await kv.lpush(`wish:${wishId}:contributions`, JSON.stringify(contribution))

        const { total, isFunded } = await reconcile(wish)
        return NextResponse.json({ wishId, contribution, totalContributed: total, isFunded })
    } catch (error) {
        console.error('Contribute gift pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const loaded = await loadContext(request, { allowZero: true })
        if ('error' in loaded) return loaded.error
        const { userId, wishId, amount, wish } = loaded.ctx

        const key = `wish:${wishId}:contributions`
        const existing = parseContributions(await kv.lrange<string>(key, 0, -1))
        const others = existing.filter((c) => c.userId !== userId)
        const now = new Date().toISOString()
        const next =
            amount > 0 ? [...others, { userId, amount, contributedAt: now } as TContribution] : others

        await kv.del(key)
        if (next.length) await kv.rpush(key, ...next.map((c) => JSON.stringify(c)))

        const { total, isFunded } = await reconcile(wish)
        return NextResponse.json({ wishId, totalContributed: total, myContribution: amount, isFunded })
    } catch (error) {
        console.error('Edit gift contribution error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
```

- [ ] **Step 2: Build** — `npm run build` → PASS.

- [ ] **Step 3: Manual check** — with a pot open on a €30 wish: `POST` `{ amount: 20 }` → `isFunded:false`; `POST` `{ amount: 20 }` again (same user, or second user) → total 40, `isFunded:true`, and `kv.get('wish:{id}')` shows `status:'funded'`. `PATCH` `{ amount: 5 }` → total drops below 30, status back to `wanted`. `PATCH` `{ amount: 0 }` → pledge removed.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/wish/contribute/route.ts
git commit -m "feat(gift-pot): POST + PATCH /api/wish/contribute with funded reconciliation"
```

---

## Task 7: Reserve route refuses a wish that has a pot

**Files:**
- Modify: `src/app/api/wish/reserve/route.ts:31-34`

**Interfaces:**
- Produces: `POST /api/wish/reserve` returns `409` when `wish:{id}:pot` exists.

- [ ] **Step 1: Add the guard** — after the existing `status` check (line ~34), before writing:

```ts
const hasPot = await kv.get(`wish:${wishId}:pot`)
if (hasPot) {
    return NextResponse.json({ message: 'This wish has a gift pot' }, { status: 409 })
}
```

- [ ] **Step 2: Build** — `npm run build` → PASS.

- [ ] **Step 3: Manual check** — open a pot on a wanted wish, then `POST /api/wish/reserve` for it → `409`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/wish/reserve/route.ts
git commit -m "feat(gift-pot): refuse to reserve a wish that has a pot"
```

---

## Task 8: Pot creator can mark a `funded` wish purchased

**Files:**
- Modify: `src/app/api/wish/mark-purchased/route.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `POST /api/wish/mark-purchased` `{ wishId }` also succeeds when the caller is the pot creator and `wish.status === 'funded'`. The pot key and contributions are left intact.

- [ ] **Step 1: Widen the authorisation** — the current route only checks list ownership / public. Add: if `wish.status === 'funded'`, require the caller to be the pot creator; otherwise keep the existing path. Replace the body after the wishlist fetch:

```ts
const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
if (!wishlist || (!wishlist.isPublic && wishlist.ownerId !== session.user.id)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
}

if (wish.status === 'purchased') {
    return NextResponse.json({ message: 'Wish is already purchased' }, { status: 409 })
}

// A funded gift pot: only its creator (the organiser) may close it out.
if (wish.status === 'funded') {
    const pot = await kv.get<{ creatorId: string }>(`wish:${wishId}:pot`)
    if (!pot || pot.creatorId !== session.user.id) {
        return NextResponse.json({ message: 'Only the pot organiser can do this' }, { status: 403 })
    }
}

const updated = { ...wish, status: 'purchased', purchasedBy: session.user.id, updatedAt: new Date().toISOString() }
await kv.set(`wish:${wishId}`, updated)
return NextResponse.json({ id: wishId, status: 'purchased', purchasedBy: session.user.id })
```

Also widen the `TWishKV` type in this file to include `status: string` if not already (`type TWishKV = { id: string; status: string; wishlistId: string }` — it already does).

- [ ] **Step 2: Build** — `npm run build` → PASS.

- [ ] **Step 3: Manual check** — fund a pot, then as the pot creator `POST /api/wish/mark-purchased` `{ wishId }` → `200`, wish `status:'purchased'`, `wish:{id}:pot` still present. As a different guest → `403`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/wish/mark-purchased/route.ts
git commit -m "feat(gift-pot): pot organiser can mark a funded wish purchased"
```

---

## Task 9: `features/CreateGiftPot` slice

**Files:**
- Create: `src/features/CreateGiftPot/model.ts`, `ui/CreateGiftPotButton.tsx`, `ui/CreateGiftPotModal.tsx`, `ui/CreateGiftPotModal.module.css`, `ui/CreateGiftPotModal.types.ts`, `ui/index.ts`, `index.ts`
- Modify: `src/shared/i18n/messages/{fr,en}.json` — add `createGiftPotModal` namespace

**Interfaces:**
- Consumes: `createGiftPot` (Task 2).
- Produces: `<CreateGiftPotButton wishId ownerName price currency isLoggedIn isInvited onPotCreated useMock? />` where `onPotCreated: (creatorId: string, creatorName: string) => void`. Renders a single discreet inline text button + its modal.

Mirror `src/features/CreatePot/` closely.

- [ ] **Step 1: `CreateGiftPotModal.types.ts`**

```ts
export type TCreateGiftPotModalState = 'closed' | 'login-required' | 'invite-required' | 'confirm'

export type TCreateGiftPotButtonProps = {
    wishId: string
    ownerName: string
    price: number
    currency: string
    isLoggedIn: boolean
    isInvited: boolean
    onPotCreated: (creatorId: string, creatorName: string) => void
    useMock?: boolean
}

export type TCreateGiftPotModalProps = {
    modalState: TCreateGiftPotModalState
    ownerName: string
    price: number
    currency: string
    isCreating: boolean
    error: string | null
    onClose: () => void
    onConfirm: () => void
}
```

- [ ] **Step 2: `model.ts`** — copy `src/features/CreatePot/model.ts` verbatim, then: rename to `useCreateGiftPotModel`, param `wishlistId`→`wishId`, import `createGiftPot` from `@/shared/api/wish/createGiftPot`, call `createGiftPot(wishId)`.

- [ ] **Step 3: `ui/CreateGiftPotButton.tsx`** — like `CreatePotButton.tsx` but:
  - `useTranslations('createGiftPotModal')`
  - the trigger is the **discreet one-liner**, not a filled button:
    ```tsx
    <button className={styles.createGiftPot__trigger} onClick={openModal}>
        {t('triggerLead')} <b>{t('triggerAction')}</b>
    </button>
    ```
  - pass `price` / `currency` through to the modal

- [ ] **Step 4: `ui/CreateGiftPotModal.tsx`** — mirror `src/features/CreatePot/ui/CreatePotModal.tsx` (read it first for the `Modal` usage and state-branch structure). Content for `confirm` state: a short hero line, the **goal shown read-only** (`{currency}{price.toFixed(2)}`) with a caption that it equals the gift's price, the "you become the organiser / pledges private / you collect the money" note, `Annuler` / `Lancer la cagnotte`. `login-required` / `invite-required` branches copy the wishlist modal's.

- [ ] **Step 5: `ui/CreateGiftPotModal.module.css`** — start from `src/features/CreatePot/ui/CreatePotModal.module.css`; add `.createGiftPot__trigger` (inline text button: `background:none; border:none; font: inherit; font-size: 11.5px; font-weight: 500; color: var(--text-tertiary); cursor: pointer; padding: 0;` with `b { color: var(--accent); font-weight: 600; }`).

- [ ] **Step 6: `ui/index.ts`** (`export * from './CreateGiftPotButton'`) and `index.ts` (`export * from './model'` + `export * from './ui'`).

- [ ] **Step 7: i18n** — add to both `fr.json` and `en.json`:

```jsonc
// fr.json
"createGiftPotModal": {
  "triggerLead": "Trop cher pour une seule personne ?",
  "triggerAction": "Ouvrir une cagnotte",
  "title": "Lancer une cagnotte",
  "goalLabel": "Objectif",
  "goalHint": "L'objectif est le prix du cadeau. Vous pouvez le dépasser.",
  "note": "Vous devenez l'organisateur·rice. Les invité·es participent en privé ; vous seul·e voyez qui donne combien, vous collectez l'argent et achetez le cadeau.",
  "loginRequired": "Connectez-vous pour lancer une cagnotte pour {ownerName}. Vous devez aussi avoir été invité·e par le propriétaire de la liste.",
  "inviteRequired": "Seuls les invité·es de {ownerName} peuvent lancer une cagnotte. Demandez-leur de partager la liste avec vous.",
  "logIn": "Se connecter",
  "gotIt": "Compris",
  "cancel": "Annuler",
  "starting": "Démarrage…",
  "start": "Lancer la cagnotte"
}
```
(en.json: same keys, English copy.)

- [ ] **Step 8: Build** — `npm run build` → PASS (slice still unused).

- [ ] **Step 9: Commit**

```bash
git add src/features/CreateGiftPot/ src/shared/i18n/messages/
git commit -m "feat(gift-pot): CreateGiftPot feature slice"
```

---

## Task 10: `features/ContributeGiftPot` slice

**Files:**
- Create: `src/features/ContributeGiftPot/model.ts`, `ui/ContributeGiftPotModal.tsx`, `ui/ContributeGiftPotModal.module.css`, `ui/ContributeGiftPotModal.types.ts`, `ui/index.ts`, `index.ts`
- Modify: `src/shared/i18n/messages/{fr,en}.json` — add `contributeGiftPotModal` namespace

**Interfaces:**
- Consumes: `contributeGiftPot`, `setGiftContribution` (Task 2).
- Produces:
  - `useContributeGiftPotModel({ wishId, onContribute?, onError?, onRemove?, onSaved?, onClose, useMock?, mode?, initialAmount? })` — `onContribute(wishId, delta)`, `onError(wishId, delta)`, `onRemove(wishId, removedAmount)`. Returns `{ amount, setAmount, isSubmitting, error, handleSubmit, handleCancel }`.
  - `<ContributeGiftPotModal isOpen onClose wishId eventName ownerName creatorName goal totalContributed userContributed currency isLoggedIn mode initialAmount onContribute onError onRemove onSaved useMock? />`

Mirror `src/features/ContributePot/` closely (read `model.ts` and `ui/ContributeModal.tsx`).

- [ ] **Step 1: `ContributeGiftPotModal.types.ts`** — copy `ContributeModal.types.ts`, swap `wishlistId`→`wishId`, add `goal: number`.

- [ ] **Step 2: `model.ts`** — copy `src/features/ContributePot/model.ts`; rename hook to `useContributeGiftPotModel`; param `wishlistId`→`wishId`; import the two fetchers from `@/shared/api/wish/contributeGiftPot`; runners become `contributeGiftPot` / `setGiftContribution` (no mock runners — guard `useMock` with a `setTimeout` + skip network, like `CreatePot/model.ts` does). Keep `useTranslations('contributeGiftPotModal')` and `t('invalidAmount')`.

- [ ] **Step 3: `ui/ContributeGiftPotModal.tsx`** — mirror `ContributeModal.tsx`. Additions: a small progress bar + `{currency}{totalContributed} / {currency}{goal}` line in the hero; quick-pick chips (`20`, `50`, `100`) that call `setAmount(String(n))`; keep the "promise not a payment — {creatorName} collects" disclaimer. Reuse `@/shared/ui` `Modal`.

- [ ] **Step 4: `ui/ContributeGiftPotModal.module.css`** — start from `ContributeModal.module.css`; add `.contributeGiftPot__bar` / `__barFill` and `.contributeGiftPot__chips` / `__chip` / `__chip--active` (pill: `border-radius:100px; border:1px solid var(--border-default); padding:8px 16px; font-weight:600;` active → `border-color/background/color` from `--accent*`).

- [ ] **Step 5: `ui/index.ts`** + `index.ts`.

- [ ] **Step 6: i18n** — add `contributeGiftPotModal` to both files. Keys: `title`, `editTitle`, `collectiveGift` (`"Un cadeau collectif pour {ownerName}"`), `organisedBy`, `raised` (`"{currency}{total} sur {currency}{goal}"`), `contributionLabel`, `disclaimer` (`"Ceci enregistre une promesse — pas un paiement. {creatorName} récupère l'argent directement auprès de chacun·e."`), `cancel`, `adding`, `addPledge`, `saving`, `savePledge`, `removePledge`, `removeConfirmTitle`, `removeConfirmBody`, `removeKeep`, `removeConfirm`, `removing`, `invalidAmount`, `loginPrompt`, `logIn`. (Copy the wishlist `contributeModal` values and adapt.)

- [ ] **Step 7: Build** — `npm run build` → PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/ContributeGiftPot/ src/shared/i18n/messages/
git commit -m "feat(gift-pot): ContributeGiftPot feature slice"
```

---

## Task 11: `widgets/GiftPotSection`

**Files:**
- Create: `src/widgets/GiftPotSection/GiftPotSection.tsx`, `GiftPotSection.module.css`, `GiftPotSection.types.ts`, `model.ts`, `index.ts`
- Modify: `src/shared/i18n/messages/{fr,en}.json` — add `giftPot` namespace

**Interfaces:**
- Consumes: `TGiftPotView` (Task 2), `CreateGiftPotButton` (Task 9), `ContributeGiftPotModal` (Task 10), `MarkPurchasedButton` from `@/features/markPurchasedWish` (existing).
- Produces:
  ```ts
  type TGiftPotSectionProps = {
    wishId: string
    wishName: string
    price: number
    currency: string
    status: TWishStatus
    eventName: string
    ownerName: string
    isLoggedIn: boolean
    isInvited: boolean
    userId?: string
    giftPot: TGiftPotView | null      // null = no pot (maybe eligible); undefined handled by WishCard (owner never renders this)
    onGiftPotCreated: (wishId: string, creatorId: string, creatorName: string) => void
    onContributeGiftPot: (wishId: string, delta: number) => void
    onContributeGiftPotError: (wishId: string, delta: number) => void
    onGiftPotRemoved: (wishId: string, removedAmount: number) => void
    onGiftPotRefreshed: (wishId: string, view: TGiftPotView | null) => void
    onMarkPurchased?: (wishId: string, userId: string) => void
    onMarkPurchasedError?: (wishId: string) => void
    useMock?: boolean
  }
  ```
  `<GiftPotSection>` renders nothing when `giftPot === null && !eligible` (eligible = `price > 0 && status === 'wanted'`).

- [ ] **Step 1: `model.ts`** — small hook mirroring `widgets/PotCard/model.ts`: `modal: 'add' | 'edit' | null` with `openAdd`/`openEdit`/`closeModal`, and a `reconcile()` that calls `getGiftPot(wishId)` then `onGiftPotRefreshed(wishId, view)`.

- [ ] **Step 2: `GiftPotSection.tsx`** — the accordion. Structure (native `<details>`), states in order:
  1. `giftPot === null` + eligible + `!isOwner` → `<CreateGiftPotButton wishId ownerName={ownerName} price={price} currency={currency} isLoggedIn={isLoggedIn} isInvited={isInvited} onPotCreated={(cid, cn) => onGiftPotCreated(wishId, cid, cn)} useMock={useMock} />` and return (no `<details>`).
  2. `giftPot === null` (not eligible) → `return null`.
  3. `<details>` with a summary: gift icon + label (`t('kicker')` or `t('funded')` when `giftPot.isFunded`) + mini bar (`giftPot.totalContributed / giftPot.goal`) + `%` + chevron.
  4. Panel body by role — reuse the design canvas markup from `design/cagnotte-cadeau/*.dc.html` (translate classes to this module):
     - not logged in → progress + `t('loginToSee')` + a button that emits `eventBus.emit('auth:openLoginModal', {})`
     - logged-in guest, `myContribution <= 0` → progress, participants, `t('organisedBy', { creatorName })`, **Participer** → `model.openAdd()`
     - logged-in guest, `myContribution > 0` → progress + `t('yourPledge')` `{currency}{myContribution}` + **Modifier** → `model.openEdit()`
     - `isCreator` → progress, `goalRow` (read-only goal), nominative `contributors` list with `overflow-y:auto; max-height: <~3 rows>` when `contributors.length > 3`, privacy note; when `giftPot.isFunded` also render `<MarkPurchasedButton wishId={wishId} userId={userId!} onMarkPurchased={(wid) => onMarkPurchased?.(wid, userId!)} onError={onMarkPurchasedError} useMock={useMock} />`
     - `giftPot.isFunded` (any role) → "Objectif atteint" copy, no *Participer*
  5. `<ContributeGiftPotModal>` rendered when `model.modal` is set, wired to `onContributeGiftPot(wishId, delta)` / `onContributeGiftPotError(wishId, delta)` / `onGiftPotRemoved(wishId, amt)` / `onSaved={() => model.reconcile()}`, `goal={giftPot.goal}`, `totalContributed={giftPot.totalContributed}`, `userContributed={giftPot.myContribution ?? 0}`, `mode={model.modal}`, `initialAmount={model.modal === 'edit' ? (giftPot.myContribution ?? 0) : 0}`.

- [ ] **Step 3: `GiftPotSection.module.css`** — port the accordion + progress + list styles from `design/cagnotte-cadeau/CagnotteEnCours.dc.html` / `VueOrganisateur.dc.html`, using the theme tokens (`var(--accent)`, `var(--border-soft)`, `var(--font-serif)`, …) rather than hard-coded hex. Match `PotCard.module.css` conventions.

- [ ] **Step 4: `index.ts`** — `export * from './GiftPotSection'`, `export type * from './GiftPotSection.types'`.

- [ ] **Step 5: i18n `giftPot` namespace** (both files) — keys: `kicker` (`"Cagnotte cadeau"`), `funded` (`"Objectif atteint"`), `loginToSee`, `organisedBy`, `yourPledge`, `contribute` (`"Participer"`), `modify` (`"Modifier"`), `pledgedTotal`, `participants` (ICU plural), `goal`, `otherParticipants` (ICU plural), `pledgesHidden`, `you`, `noteGuest`, `noteOrganizer`, `fundedBody` (`"{creatorName} organise l'achat. La cagnotte est close — pensez à remettre votre part."`), `markPurchased` (`"Marquer comme acheté"`), `markPurchasedHint` (`"Visible uniquement par vous."`). Reuse `potCard` values where they line up.

- [ ] **Step 6: Build** — `npm run build` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/widgets/GiftPotSection/ src/shared/i18n/messages/
git commit -m "feat(gift-pot): GiftPotSection widget"
```

---

## Task 12: Wire `GiftPotSection` into `WishCard`

**Files:**
- Modify: `src/widgets/WishCard/WishCard.types.ts`
- Modify: `src/widgets/WishCard/WishCard.tsx`
- Modify: `src/widgets/WishCard/index.ts` (only if a re-export is needed)

**Interfaces:**
- Consumes: `GiftPotSection` (Task 11), `TGiftPotView` (Task 2).
- Produces: `TWishCard` gains:
  ```ts
  giftPot?: TGiftPotView | null
  onGiftPotCreated?: (wishId: string, creatorId: string, creatorName: string) => void
  onContributeGiftPot?: (wishId: string, delta: number) => void
  onContributeGiftPotError?: (wishId: string, delta: number) => void
  onGiftPotRemoved?: (wishId: string, removedAmount: number) => void
  onGiftPotRefreshed?: (wishId: string, view: TGiftPotView | null) => void
  isLoggedIn?: boolean
  isInvited?: boolean
  eventName?: string
  ownerName?: string
  ```

- [ ] **Step 1: Types** — add the props above to `TWishCard`.

- [ ] **Step 2: WishCard render + button gating** — in `WishCard.tsx`:
  - compute `const giftPotActive = giftPot != null` and `const giftPotEligible = price > 0 && status === 'wanted'`
  - render `<GiftPotSection>` **only for non-owners** (`!isOwner`) and only when `giftPot !== undefined` (owner passes `undefined`); place it after `.wish-card__actions` inside `.wish-card__content`, wiring the callbacks straight through (they already carry `wishId` in signature, so pass the section's `wishId={id}`)
  - in the `showGuestAction` block: wrap the `ReserveButton` render in `!giftPotActive &&` ; wrap the `buyNow` `<a>` in `!giftPotActive &&` (the organiser's buy affordance now lives in `GiftPotSection`)
  - leave the `reserved` / `purchased` action branches unchanged

- [ ] **Step 3: Build** — `npm run build` → PASS (call sites in `views/wishlist` don't yet pass the new props — all optional, so TS is fine).

- [ ] **Step 4: Commit**

```bash
git add src/widgets/WishCard/
git commit -m "feat(gift-pot): render GiftPotSection in WishCard, gate reserve/buy while a pot is active"
```

---

## Task 13: Server wiring in `wishlist/[id]/page.tsx`

**Files:**
- Modify: `src/app/[locale]/wishlist/[id]/page.tsx`

**Interfaces:**
- Consumes: `readGiftPotForViewer` (Task 4).
- Produces: each `TWishCard` in `initialItems` carries `giftPot` (a `TGiftPotView | null`) for non-owners, `undefined` for owners. For owners, any wish with `status: 'funded'` is mapped to `'wanted'` before being sent.

- [ ] **Step 1: Extend `KVWish`** — add `status: 'wanted' | 'purchased' | 'reserved' | 'proposed' | 'funded'` (widen the existing union).

- [ ] **Step 2: Batch-fetch gift pots (non-owners only)** — after `rawWishes` is built:

```ts
const giftPotViews = userIsOwner
    ? new Map<string, null>()
    : new Map(
          await Promise.all(
              rawWishes.map(async (w) => [
                  w.id,
                  await readGiftPotForViewer({ wishId: w.id, userId: session?.user?.id ?? null }),
              ] as const),
          ),
      )
```

- [ ] **Step 3: Attach in the `items` map** — in the existing `rawWishes.map`:

```ts
status: userIsOwner && w.status === 'funded' ? 'wanted' : w.status,
// ...
giftPot: userIsOwner ? undefined : giftPotViews.get(w.id) ?? null,
```

- [ ] **Step 4: `hasActivity`** — a wish with a pot (even one that fell back to `wanted`) counts:

```ts
const anyGiftPot = userIsOwner
    ? (await Promise.all(rawWishes.map((w) => kv.get(`wish:${w.id}:pot`)))).some(Boolean)
    : Array.from(giftPotViews.values()).some((v) => v !== null)

const hasActivity =
    rawWishes.some((w) => w.status !== 'wanted') || potExists || anyGiftPot || commentsCount > 0
```

- [ ] **Step 5: Pass owner/guest context for the card** — `page.tsx` already computes `isInvited`, `ownerName`, `isLoggedIn`. These flow through `WishlistPageClient` → `views/wishlist`; ensure `views/wishlist` forwards `isLoggedIn` / `isInvited` / `ownerName` / `eventName` (the wishlist `name`) to `WishCard` in Task 14.

- [ ] **Step 6: Build** — `npm run build` → PASS.

- [ ] **Step 7: Manual check** — page as a guest with a funded wish shows the "Financé" badge; as the owner the same wish shows "Souhaité" and no pot.

- [ ] **Step 8: Commit**

```bash
git add src/app/[locale]/wishlist/[id]/page.tsx
git commit -m "feat(gift-pot): fetch per-wish pot views server-side; hide funded from owner"
```

---

## Task 14: Client state + prop threading (`WishlistPageClient`, `views/wishlist`)

**Files:**
- Modify: `src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx`
- Modify: `src/views/wishlist/wishlist.tsx`

**Interfaces:**
- Consumes: `TGiftPotView` (Task 2), the `WishCard` props from Task 12.
- Produces: gift-pot actions update both `giftPots` state and, on a funded flip, the wish's `status` in `items`.

- [ ] **Step 1: `WishlistPageClient` — state**

```ts
const [giftPots, setGiftPots] = useState<Record<string, TGiftPotView | null>>(
    () => Object.fromEntries(initialItems.map((i) => [i.id, i.giftPot ?? null])),
)
```

- [ ] **Step 2: `WishlistPageClient` — helpers**

```ts
const patchGiftPot = (wishId: string, delta: number) =>
    setGiftPots((prev) => {
        const cur = prev[wishId]
        if (!cur) return prev
        const wasIn = (cur.myContribution ?? 0) > 0
        const nextMine = Math.max(0, (cur.myContribution ?? 0) + delta)
        const willBeIn = nextMine > 0
        const countShift = willBeIn === wasIn ? 0 : willBeIn ? 1 : -1
        const total = Math.max(0, cur.totalContributed + delta)
        const next: TGiftPotView = {
            ...cur,
            totalContributed: total,
            myContribution: nextMine,
            participantCount: Math.max(0, (cur.participantCount ?? 0) + countShift),
            isFunded: cur.goal > 0 && total >= cur.goal,
        }
        // keep the card's status in step with the derived funded state
        setItems((items) =>
            items.map((it) =>
                it.id === wishId
                    ? { ...it, status: next.isFunded ? 'funded' : it.status === 'funded' ? 'wanted' : it.status }
                    : it,
            ),
        )
        return { ...prev, [wishId]: next }
    })

const handleGiftPotCreated = (wishId: string, creatorId: string, creatorName: string) => {
    setGiftPots((prev) => ({
        ...prev,
        [wishId]: {
            creatorId, creatorName, isCreator: true,
            goal: items.find((i) => i.id === wishId)?.price ?? 0,
            totalContributed: 0, isFunded: false, myContribution: 0,
            participantCount: 0, contributors: [],
        },
    }))
    toast(t('giftPotStarted'), 'success')
}

const handleContributeGiftPot = (wishId: string, delta: number) => { patchGiftPot(wishId, delta); toast(t('contributionAdded'), 'success') }
const handleContributeGiftPotError = (wishId: string, delta: number) => { patchGiftPot(wishId, -delta); toast(t('contributionError'), 'error') }
const handleGiftPotRemoved = (wishId: string, removed: number) => { patchGiftPot(wishId, -removed); toast(t('pledgeRemoved'), 'info') }
const handleGiftPotRefreshed = (wishId: string, view: TGiftPotView | null) =>
    setGiftPots((prev) => ({ ...prev, [wishId]: view }))
```

Add `giftPotStarted` to the `wishlistToast` i18n namespace (both files).

- [ ] **Step 3: `WishlistPageClient` — pass down** — add to the `<Wishlist>` props: `giftPots`, `onGiftPotCreated={handleGiftPotCreated}`, `onContributeGiftPot`, `onContributeGiftPotError`, `onGiftPotRemoved`, `onGiftPotRefreshed`, plus `isLoggedIn`, `isInvited` (already in scope), `ownerName`, `eventName={wishlistMeta.name}`. Mark-purchased handlers already exist (`onMarkPurchasedWish` / `onMarkPurchasedError`).

- [ ] **Step 4: `views/wishlist/wishlist.tsx` — accept + forward** — add the same props to the `Props` type and the component signature; forward them to **every** `<WishCard>` call site (4: two in the main grid ~L615 & ~L656, two in the proposed section ~L758 & ~L825 — the proposed ones can pass `giftPot={undefined}` since proposed wishes never get a pot). For each real card:

```tsx
giftPot={giftPots[item.id]}
onGiftPotCreated={onGiftPotCreated}
onContributeGiftPot={onContributeGiftPot}
onContributeGiftPotError={onContributeGiftPotError}
onGiftPotRemoved={onGiftPotRemoved}
onGiftPotRefreshed={onGiftPotRefreshed}
isLoggedIn={isLoggedIn}
isInvited={isInvited}
ownerName={ownerName}
eventName={eventName}
```

- [ ] **Step 5: `views/wishlist` — funded counts as wanted** — in these spots add `|| item.status === 'funded'` next to the `'wanted'` check:
  - `wantedItems` (`items.filter((item) => item.status === 'wanted')`, ~L208)
  - the status-filter predicate in `filteredAndSortedItems` (~L177-190) — when `'wanted'` is an active filter, funded items must pass
  - the "open to buy" count shown on the filter button (`wantedItems.length`, ~L536) — already covered if `wantedItems` includes funded
  - `filterAll` / `resultsCount` totals use `i.status !== 'proposed'` — funded already included, no change

  Leave `purchasedItems` / `reservedItems` unchanged (funded is neither).

- [ ] **Step 6: Build** — `npm run build` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx src/views/wishlist/wishlist.tsx src/shared/i18n/messages/
git commit -m "feat(gift-pot): client state + prop threading through the wishlist view"
```

---

## Task 15: End-to-end manual QA + polish

**Files:**
- Modify: whatever the QA pass turns up (expect small CSS/spacing fixes in `GiftPotSection.module.css`).

- [ ] **Step 1: Full build** — `npm run build` → PASS with no warnings introduced by this feature.

- [ ] **Step 2: Run the spec's QA checklist** (`npm run dev`), section "Testing", items 1–9. Use two browser profiles (owner + invited guest) and a priced wanted wish.

- [ ] **Step 3: Fix** anything that fails; keep changes minimal and within the touched files.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(gift-pot): QA pass polish"
```

- [ ] **Step 5: Update the spec status** — set the header of `docs/superpowers/specs/2026-08-28-gift-pot-per-wish-design.md` to `Status: Implemented`. Commit.

---

## Self-Review

**Spec coverage:**
- Data model (KV keys, total computed) → Tasks 4, 6 ✓
- Goal = price, no pot without price → Task 5 (guards 6) ✓
- `funded` status + reconcile + revert → Tasks 1, 3, 6 ✓
- Organiser override to `purchased`, pot kept → Task 8, Task 11 (MarkPurchasedButton in organiser view) ✓
- Owner masking (status + surprise) → Task 1 (visibleStatus), Task 13 (funded→wanted, no fetch) ✓
- API routes GET/POST pot, POST/PATCH contribute → Tasks 5, 6 ✓
- `readGiftPotForViewer` shared with page → Tasks 4, 13 ✓
- Reserve refused while pot active (server + UI) → Task 7 (server), Task 12 (UI) ✓
- New slices `CreateGiftPot` / `ContributeGiftPot` / `GiftPotSection` → Tasks 9, 10, 11 ✓
- WishCard props + button rules → Task 12 ✓
- `page.tsx` batch fetch + hasActivity → Task 13 ✓
- `WishlistPageClient` state + optimistic patch + status flip → Task 14 ✓
- `views/wishlist` threading + funded-as-wanted → Task 14 ✓
- i18n namespaces `giftPot`, `createGiftPotModal`, `contributeGiftPotModal`, `statusFunded`, `giftPotStarted` → Tasks 1, 9, 10, 11, 14 ✓
- Testing = build gate + manual checklist → every task + Task 15 ✓
- Out of scope (payments, notifications, goal editing, proposed-wish pots, migration) → not implemented ✓
- Contribution guards mirror `/api/wishlist/contribute` (logged-in account, public list) → Task 6 `loadContext` ✓

**Placeholder scan:** No TBD/TODO. React-slice tasks (9–11) point at a concrete sibling file to copy and list the exact deltas rather than repeating ~150 lines of modal boilerplate — acceptable given "mirror the existing slice" is a Global Constraint and the sibling is named precisely.

**Type consistency:**
- `TGiftPotView` defined in Task 2, consumed identically in Tasks 4, 6 (`isFunded`, `goal`, `totalContributed`, `myContribution`, `participantCount`, `contributors`), 11, 12, 14 ✓
- `reconcileFundedStatus(currentStatus, total, goal)` — Task 3 defines, Task 6 calls with `(wish.status, total, wish.price ?? 0)` ✓
- `readGiftPotForViewer({ wishId, userId })` — Task 4 defines, Tasks 5 & 13 call with that exact shape ✓
- Client fetchers: `contributeGiftPot` / `setGiftContribution` names used consistently in Tasks 2, 10 ✓
- `onGiftPotCreated(wishId, creatorId, creatorName)` — Task 11 emits, Task 14 handler signature matches ✓
- `giftPot` prop is `TGiftPotView | null` for non-owners, `undefined` for owners — consistent across Tasks 11, 12, 13, 14 ✓
