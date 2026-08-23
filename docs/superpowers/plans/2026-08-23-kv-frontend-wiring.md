# KV Frontend Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire three pages (wishlists, history, wishlist detail) to real Vercel KV data instead of hardcoded mocks.

**Architecture:** Each page becomes an async server component that calls KV directly (same pattern as the dashboard at `src/app/[locale]/page.tsx`). Client-side interactivity is extracted into co-located `*PageClient.tsx` client components that receive initial data as props.

**Tech Stack:** Next.js App Router, `@vercel/kv`, NextAuth `getServerSession`, TypeScript, CSS Modules.

---

## File Map

| File | Action |
|------|--------|
| `src/app/[locale]/wishlists/page.tsx` | Rewrite as async server component |
| `src/app/[locale]/wishlists/WishlistsPageClient.tsx` | New — extract client logic from current page.tsx |
| `src/app/[locale]/history/page.tsx` | Rewrite as async server component |
| `src/app/[locale]/history/HistoryPageClient.tsx` | New — extract client logic from current page.tsx |
| `src/app/[locale]/wishlist/[id]/page.tsx` | Rewrite as async server component |
| `src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx` | New — extract client logic from current page.tsx |

No changes to `src/views/`, `src/widgets/`, or API routes.

---

## Reference Pattern

The dashboard page is the canonical example to follow:

```typescript
// src/app/[locale]/page.tsx (already done — reference this)
import { getServerSession } from "next-auth"
import { kv } from "@vercel/kv"
import { authOptions } from "@/shared/config/authOptions"

export default async function HomePage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
        const wishlistIds = await kv.smembers<string[]>(`user:${session.user.id}:wishlists`)
        // ...fetch and render
    }
}
```

---

## KV Data Shape Reference

KV stores raw objects with string dates. Map them to UI types when passing as props:

```typescript
// What kv.get(`wishlist:{id}`) returns:
type KVWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    eventDate: string       // ISO string, NOT a Date object
    createdAt: string       // ISO string
    updatedAt?: string
    totalContributed?: number
}

// What kv.get(`wish:{id}`) returns:
type KVWish = {
    id: string
    wishlistId: string
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: 'low' | 'medium' | 'high'
    status: 'wanted' | 'purchased' | 'reserved' | 'proposed'
    purchaseUrl?: string
    notes?: string
    createdAt: string
    reservedBy?: string
    purchasedBy?: string
    proposedBy?: string
    showToOwner?: boolean
}
```

---

## Task 1: WishlistsPageClient — extract client logic

**Files:**
- Create: `src/app/[locale]/wishlists/WishlistsPageClient.tsx`

The current `wishlists/page.tsx` is a client component. Extract all its logic into this new file. The server component (Task 2) will render this client component with real data.

- [ ] **Step 1: Create WishlistsPageClient.tsx**

```tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { WishlistList } from '@/widgets'
import { TWishlistCard } from '@/widgets/WishlistCard'
import { OwnerFilter } from '@/features/FilterWishlistOwner'
import { TWishlistOwner } from '@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types'
import { Tabs } from '@/shared/ui'
import { eventBus } from '@/shared/eventBus'
import { Link } from '@/shared/i18n/navigation'
import { CreateWishlistModal } from '@/features/CreateWishlist'
import { TWishlistFormData } from '@/entities/wishlist'
import { UpdateWishlistModal } from '@/features/UpdateWishlist'
import { isEventPast } from '@/shared/lib/isEventPast'

import pageStyles from './page.module.css'

type Props = {
    initialWishlists: TWishlistCard[]
    userId: string
    userName: string
}

const toast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') =>
    eventBus.emit('ui:toast', { message, type })

export default function WishlistsPageClient({ initialWishlists, userId, userName }: Props) {
    const t = useTranslations('wishlists')
    const [wishlists, setWishlists] = useState<TWishlistCard[]>(initialWishlists)
    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)
    const [updatingWishlistId, setUpdatingWishlistId] = useState<string | null>(null)

    useEffect(() => {
        const removeOpenModalEvent = eventBus.on('wishlist:openUpdateModal', (payload: { id?: string }) => {
            if (payload.id) setUpdatingWishlistId(payload.id)
        })
        return () => { removeOpenModalEvent() }
    }, [])

    const sortByEventDate = (a: TWishlistCard, b: TWishlistCard) =>
        a.eventDate.getTime() - b.eventDate.getTime()

    const activeWishlists = useMemo(() =>
        wishlists.filter((w) => !isEventPast(w.eventDate)),
        [wishlists]
    )

    const ownedWishlists = useMemo(() =>
        activeWishlists.filter((w) => w.ownerId === userId).sort(sortByEventDate),
        [activeWishlists, userId]
    )

    const allInvitedWishlists = useMemo(() =>
        activeWishlists.filter((w) => w.ownerId !== userId).sort(sortByEventDate),
        [activeWishlists, userId]
    )

    const uniqueInvitedOwners = useMemo(() => {
        const ownersMap = new Map<string, { id: string; name: string }>()
        allInvitedWishlists.forEach((wishlist) => {
            if (!ownersMap.has(wishlist.ownerId)) {
                ownersMap.set(wishlist.ownerId, { id: wishlist.ownerId, name: wishlist.ownerName })
            }
        })
        return Array.from(ownersMap.values()).sort()
    }, [allInvitedWishlists])

    const filteredInvitedWishlists = useMemo(() => {
        if (!selectedOwnerFilter) return allInvitedWishlists
        return allInvitedWishlists.filter((w) => w.ownerId === selectedOwnerFilter.id)
    }, [allInvitedWishlists, selectedOwnerFilter])

    const handleCreateWishlist = (wishlistData: TWishlistFormData & { id: string; isPending?: boolean }) => {
        const isPending = wishlistData.isPending ?? false
        if (isPending) {
            const newWishlist: TWishlistCard = {
                id: wishlistData.id,
                name: wishlistData.name,
                description: wishlistData.description,
                coverImage: wishlistData.coverImage,
                isPublic: wishlistData.isPublic,
                ownerId: userId,
                ownerName: userName,
                eventDate: wishlistData.eventDate ? new Date(wishlistData.eventDate) : new Date(),
                createdAt: new Date(),
                itemCount: 0,
                isPending: true,
            }
            setWishlists((prev) => [newWishlist, ...prev])
        } else {
            setWishlists((prev) =>
                prev.map((wishlist) => {
                    if (
                        wishlist.isPending &&
                        wishlist.ownerId === userId &&
                        wishlist.name === wishlistData.name &&
                        wishlist.description === wishlistData.description &&
                        wishlist.isPublic === wishlistData.isPublic &&
                        wishlist.coverImage === wishlistData.coverImage
                    ) {
                        return { ...wishlist, id: wishlistData.id, isPending: false }
                    }
                    return wishlist
                })
            )
            toast(`"${wishlistData.name}" created`, 'success')
        }
    }

    const handleUpdateWishlist = (wishlistData: TWishlistFormData & { id: string }) => {
        setWishlists((prev) =>
            prev.map((wishlist) =>
                wishlist.id === wishlistData.id
                    ? {
                          ...wishlist,
                          name: wishlistData.name,
                          description: wishlistData.description,
                          coverImage: wishlistData.coverImage,
                          isPublic: wishlistData.isPublic,
                          eventDate: wishlistData.eventDate ? new Date(wishlistData.eventDate) : wishlist.eventDate,
                      }
                    : wishlist
            )
        )
        setUpdatingWishlistId(null)
        toast(`"${wishlistData.name}" updated`, 'success')
    }

    const displayName = userName.split(' ')[0] ?? 'there'
    const totalWishlists = activeWishlists.length
    const ownedCount = ownedWishlists.length
    const sharedCount = allInvitedWishlists.length

    const tabs = [
        {
            label: t('tabMine'),
            content: (
                <WishlistList
                    wishlistCardList={ownedWishlists}
                    title={t('listTitleMine')}
                    emptyMessage={t('emptyMine')}
                    showCreateButton={true}
                />
            ),
        },
        {
            label: t('tabShared'),
            content: (
                <>
                    <div className={pageStyles.filterContainer}>
                        <OwnerFilter
                            owners={uniqueInvitedOwners}
                            selectedOwner={selectedOwnerFilter?.name}
                            onSelectOwner={setSelectedOwnerFilter}
                        />
                    </div>
                    <WishlistList
                        wishlistCardList={filteredInvitedWishlists}
                        title={t('listTitleShared')}
                        emptyMessage={t('emptyShared')}
                        showCreateButton={false}
                    />
                </>
            ),
        },
    ]

    return (
        <main>
            <div className={pageStyles.pageHero}>
                <div className={pageStyles.pageHero__inner}>
                    <p className={pageStyles.pageHero__greeting}>{t('greeting', { name: displayName })}</p>
                    <h1 className={pageStyles.pageHero__title}>{t('title')}</h1>
                    <div className={pageStyles.pageHero__stats}>
                        <span className={pageStyles.pageHero__stat}>
                            <strong>{totalWishlists}</strong> {t('statTotal')}
                        </span>
                        <span className={pageStyles.pageHero__statDivider}>·</span>
                        <span className={pageStyles.pageHero__stat}>
                            <strong>{ownedCount}</strong> {t('statYours')}
                        </span>
                        <span className={pageStyles.pageHero__statDivider}>·</span>
                        <span className={pageStyles.pageHero__stat}>
                            <strong>{sharedCount}</strong> {t('statShared')}
                        </span>
                    </div>
                    <div className={pageStyles.pageHero__actions}>
                        <button
                            className={pageStyles.pageHero__cta}
                            onClick={() => eventBus.emit('wishlist:openCreationModal', {})}
                        >
                            {t('newWishlist')}
                        </button>
                        <Link href="/history" className={pageStyles.pageHero__historyLink}>
                            <span className={pageStyles.pageHero__historyIcon}>↩</span>
                            {t('viewPast')}
                        </Link>
                    </div>
                </div>
            </div>

            <div className={pageStyles.pageContent}>
                <Tabs tabs={tabs} />
            </div>

            <CreateWishlistModal
                onSubmit={handleCreateWishlist}
                onError={(tempId) => {
                    setWishlists((prev) => prev.filter((w) => w.id !== tempId))
                    toast(t('createError'), 'error')
                }}
            />
            <UpdateWishlistModal onSubmit={handleUpdateWishlist} />
        </main>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/wishlists/WishlistsPageClient.tsx
git commit -m "feat: extract WishlistsPageClient client component"
```

---

## Task 2: Rewrite wishlists/page.tsx as server component

**Files:**
- Modify: `src/app/[locale]/wishlists/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire file content with:

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { TWishlistCard } from '@/widgets/WishlistCard'
import WishlistsPageClient from './WishlistsPageClient'

type KVWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    eventDate: string
    createdAt: string
}

export default async function WishlistsPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/')

    const userId = session.user.id
    const userName = session.user.name ?? session.user.email ?? 'there'

    const wishlistIds = await kv.smembers<string[]>(`user:${userId}:wishlists`)

    const rawWishlists = wishlistIds?.length
        ? (await Promise.all(wishlistIds.map((id) => kv.get<KVWishlist>(`wishlist:${id}`)))).filter(Boolean) as KVWishlist[]
        : []

    const itemCounts = rawWishlists.length
        ? await Promise.all(rawWishlists.map((w) => kv.scard(`wishlist:${w.id}:wishes`)))
        : []

    const wishlists: TWishlistCard[] = rawWishlists.map((w, i) => ({
        id: w.id,
        ownerId: w.ownerId,
        ownerName: userName,
        name: w.name,
        description: w.description,
        coverImage: w.coverImage,
        isPublic: w.isPublic,
        eventDate: new Date(w.eventDate),
        createdAt: new Date(w.createdAt),
        itemCount: itemCounts[i] ?? 0,
    }))

    return (
        <WishlistsPageClient
            initialWishlists={wishlists}
            userId={userId}
            userName={userName}
        />
    )
}
```

- [ ] **Step 2: Verify the app compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors on `wishlists/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/wishlists/page.tsx
git commit -m "feat: wire wishlists page to real KV data"
```

---

## Task 3: HistoryPageClient — extract client logic

**Files:**
- Create: `src/app/[locale]/history/HistoryPageClient.tsx`

- [ ] **Step 1: Create HistoryPageClient.tsx**

```tsx
'use client'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { WishlistList } from '@/widgets'
import { TWishlistCard } from '@/widgets/WishlistCard'
import { OwnerFilter } from '@/features/FilterWishlistOwner'
import { TWishlistOwner } from '@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types'
import { Tabs } from '@/shared/ui'

import pageStyles from './page.module.css'

type Props = {
    initialWishlists: TWishlistCard[]
    userId: string
    userName: string
}

export default function HistoryPageClient({ initialWishlists, userId, userName }: Props) {
    const t = useTranslations('history')
    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)

    const sortByEventDate = (a: TWishlistCard, b: TWishlistCard) =>
        b.eventDate.getTime() - a.eventDate.getTime()

    const ownedWishlists = useMemo(() =>
        initialWishlists.filter((w) => w.ownerId === userId).sort(sortByEventDate),
        [initialWishlists, userId]
    )

    const allInvitedWishlists = useMemo(() =>
        initialWishlists.filter((w) => w.ownerId !== userId).sort(sortByEventDate),
        [initialWishlists, userId]
    )

    const uniqueInvitedOwners = useMemo(() => {
        const ownersMap = new Map<string, { id: string; name: string }>()
        allInvitedWishlists.forEach((wishlist) => {
            if (!ownersMap.has(wishlist.ownerId)) {
                ownersMap.set(wishlist.ownerId, { id: wishlist.ownerId, name: wishlist.ownerName })
            }
        })
        return Array.from(ownersMap.values()).sort()
    }, [allInvitedWishlists])

    const filteredInvitedWishlists = useMemo(() => {
        if (!selectedOwnerFilter) return allInvitedWishlists
        return allInvitedWishlists.filter((w) => w.ownerId === selectedOwnerFilter.id)
    }, [allInvitedWishlists, selectedOwnerFilter])

    const displayName = userName.split(' ')[0] ?? 'there'
    const totalPast = initialWishlists.length
    const ownedCount = ownedWishlists.length
    const sharedCount = allInvitedWishlists.length

    const tabs = [
        {
            label: t('tabMine'),
            content: (
                <WishlistList
                    wishlistCardList={ownedWishlists}
                    title={t('listTitleMine')}
                    emptyMessage={t('emptyMine')}
                    showCreateButton={false}
                    isHistory={true}
                />
            ),
        },
        {
            label: t('tabShared'),
            content: (
                <>
                    <div className={pageStyles.filterContainer}>
                        <OwnerFilter
                            owners={uniqueInvitedOwners}
                            selectedOwner={selectedOwnerFilter?.name}
                            onSelectOwner={setSelectedOwnerFilter}
                        />
                    </div>
                    <WishlistList
                        wishlistCardList={filteredInvitedWishlists}
                        title={t('listTitleShared')}
                        emptyMessage={t('emptyShared')}
                        showCreateButton={false}
                        isHistory={true}
                    />
                </>
            ),
        },
    ]

    return (
        <main>
            <div className={pageStyles.pageHero}>
                <div className={pageStyles.pageHero__inner}>
                    <p className={pageStyles.pageHero__greeting}>{t('greeting', { name: displayName })}</p>
                    <h1 className={pageStyles.pageHero__title}>{t('title')}</h1>
                    <div className={pageStyles.pageHero__stats}>
                        <span className={pageStyles.pageHero__stat}>
                            {t('statPast', { count: totalPast })}
                        </span>
                        <span className={pageStyles.pageHero__statDivider}>·</span>
                        <span className={pageStyles.pageHero__stat}>
                            <strong>{ownedCount}</strong> {t('statYours')}
                        </span>
                        <span className={pageStyles.pageHero__statDivider}>·</span>
                        <span className={pageStyles.pageHero__stat}>
                            <strong>{sharedCount}</strong> {t('statShared')}
                        </span>
                    </div>
                    <p className={pageStyles.pageHero__subtitle}>{t('subtitle')}</p>
                </div>
            </div>

            <div className={pageStyles.pageContent}>
                <Tabs tabs={tabs} />
            </div>
        </main>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/history/HistoryPageClient.tsx
git commit -m "feat: extract HistoryPageClient client component"
```

---

## Task 4: Rewrite history/page.tsx as server component

**Files:**
- Modify: `src/app/[locale]/history/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { TWishlistCard } from '@/widgets/WishlistCard'
import { isEventPast } from '@/shared/lib/isEventPast'
import HistoryPageClient from './HistoryPageClient'

type KVWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    eventDate: string
    createdAt: string
}

export default async function HistoryPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/')

    const userId = session.user.id
    const userName = session.user.name ?? session.user.email ?? 'there'

    const wishlistIds = await kv.smembers<string[]>(`user:${userId}:wishlists`)

    const rawWishlists = wishlistIds?.length
        ? (await Promise.all(wishlistIds.map((id) => kv.get<KVWishlist>(`wishlist:${id}`)))).filter(Boolean) as KVWishlist[]
        : []

    const pastWishlists = rawWishlists.filter((w) => isEventPast(new Date(w.eventDate)))

    const itemCounts = pastWishlists.length
        ? await Promise.all(pastWishlists.map((w) => kv.scard(`wishlist:${w.id}:wishes`)))
        : []

    const wishlists: TWishlistCard[] = pastWishlists.map((w, i) => ({
        id: w.id,
        ownerId: w.ownerId,
        ownerName: userName,
        name: w.name,
        description: w.description,
        coverImage: w.coverImage,
        isPublic: w.isPublic,
        eventDate: new Date(w.eventDate),
        createdAt: new Date(w.createdAt),
        itemCount: itemCounts[i] ?? 0,
        isHistory: true,
    }))

    return (
        <HistoryPageClient
            initialWishlists={wishlists}
            userId={userId}
            userName={userName}
        />
    )
}
```

- [ ] **Step 2: Verify the app compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors on `history/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/history/page.tsx
git commit -m "feat: wire history page to real KV data"
```

---

## Task 5: WishlistPageClient — extract client logic from wishlist detail page

**Files:**
- Create: `src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx`

This is the client layer for the wishlist detail. It receives the fetched wishlist + wishes as props and manages mutation state.

- [ ] **Step 1: Create WishlistPageClient.tsx**

```tsx
'use client'
import { useState } from 'react'

import Wishlist from '@/views/wishlist/wishlist'
import { TWishCard } from '@/widgets/WishCard/WishCard.types'
import { TWishFormData, TProposedWishFormData } from '@/entities/wish'
import { eventBus } from '@/shared/eventBus'

type Props = {
    id: string
    name: string
    description: string
    isPublic: boolean
    eventDate: string
    ownerId: string
    ownerName: string
    currency: string
    userIsOwner: boolean
    isHistory: boolean
    userId: string
    initialItems: TWishCard[]
    initialTotalContributed: number
    initialUserContributed: number
}

const toast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') =>
    eventBus.emit('ui:toast', { message, type })

export default function WishlistPageClient({
    id,
    name,
    description,
    isPublic,
    eventDate,
    ownerId,
    ownerName,
    currency,
    userIsOwner,
    isHistory,
    userId,
    initialItems,
    initialTotalContributed,
    initialUserContributed,
}: Props) {
    const [items, setItems] = useState<TWishCard[]>(initialItems)
    const [totalContributed, setTotalContributed] = useState(initialTotalContributed)
    const [userContributed, setUserContributed] = useState(initialUserContributed)

    const handleReserveWish = (wishId: string, reservedBy: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'reserved', reservedBy } : item
        ))
        const name = items.find((i) => i.id === wishId)?.name
        toast(name ? `"${name}" reserved` : 'Wish reserved', 'success')
    }

    const handleReserveError = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId
                ? { ...item, status: item.isProposed ? 'proposed' : 'wanted', reservedBy: undefined }
                : item
        ))
        toast('Could not reserve wish — please try again', 'error')
    }

    const handleCancelReservation = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'wanted', reservedBy: undefined } : item
        ))
        toast('Reservation cancelled', 'info')
    }

    const handleCancelError = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'reserved', reservedBy: userId } : item
        ))
        toast('Could not cancel reservation — please try again', 'error')
    }

    const handleMarkPurchased = (wishId: string, purchasedBy: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'purchased', purchasedBy } : item
        ))
        const name = items.find((i) => i.id === wishId)?.name
        toast(name ? `"${name}" marked as purchased` : 'Wish marked as purchased', 'success')
    }

    const handleMarkPurchasedError = (wishId: string) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== wishId) return item
            return { ...item, status: item.reservedBy ? 'reserved' : 'wanted', purchasedBy: undefined }
        }))
        toast('Could not mark as purchased — please try again', 'error')
    }

    const handleRemovePurchased = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'wanted', purchasedBy: undefined } : item
        ))
        toast('Marked as available again', 'info')
    }

    const handleRemovePurchasedError = (wishId: string) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== wishId) return item
            const original = initialItems.find((i) => i.id === wishId)
            return { ...item, status: 'purchased', purchasedBy: original?.purchasedBy }
        }))
        toast('Could not update wish — please try again', 'error')
    }

    const handleDeleteWish = (wishId: string) => {
        const name = items.find((i) => i.id === wishId)?.name
        setItems((prev) => prev.filter((item) => item.id !== wishId))
        toast(name ? `"${name}" deleted` : 'Wish deleted', 'info')
    }

    const handleDeleteError = (wishId: string) => {
        const original = initialItems.find((item) => item.id === wishId)
        if (original) setItems((prev) => [...prev, original])
        toast('Could not delete wish — please try again', 'error')
    }

    const handleUpdateWish = (wishId: string, updatedWish: TWishFormData & { id: string }) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId
                ? {
                      ...item,
                      name: updatedWish.name,
                      description: updatedWish.description,
                      price: updatedWish.price,
                      currency: updatedWish.currency,
                      imageUrl: updatedWish.imageUrl,
                      priority: updatedWish.priority,
                      purchaseUrl: updatedWish.purchaseUrl,
                      notes: updatedWish.notes,
                  }
                : item
        ))
    }

    const handleAddWish = (wish: TWishFormData & { id: string }) => {
        const newWishCard: TWishCard = {
            id: wish.id,
            name: wish.name,
            description: wish.description,
            price: wish.price,
            currency: wish.currency,
            imageUrl: wish.imageUrl,
            priority: wish.priority,
            status: 'wanted',
            purchaseUrl: wish.purchaseUrl,
            notes: wish.notes,
            addedDate: 'just now',
        }
        setItems((prev) => [...prev, newWishCard])
    }

    const handleProposeWish = (wish: TProposedWishFormData & { id: string }) => {
        const newWishCard: TWishCard = {
            id: wish.id,
            name: wish.name,
            description: wish.description,
            price: wish.price,
            currency: wish.currency,
            imageUrl: wish.imageUrl,
            priority: 'medium',
            status: 'proposed',
            isProposed: true,
            purchaseUrl: wish.purchaseUrl,
            notes: wish.notes,
            addedDate: 'just now',
        }
        setItems((prev) => [...prev, newWishCard])
    }

    const handleContribute = (_wishlistId: string, amount: number) => {
        setTotalContributed((prev) => prev + amount)
        setUserContributed((prev) => prev + amount)
        toast('Thank you! Your gift has been added to the pot', 'success')
    }

    const handleContributeError = (_wishlistId: string, amount: number) => {
        setTotalContributed((prev) => prev - amount)
        setUserContributed((prev) => prev - amount)
        toast('Could not add your contribution — please try again', 'error')
    }

    return (
        <main>
            <Wishlist
                id={id}
                name={name}
                description={description}
                isPublic={isPublic}
                eventDate={eventDate}
                ownerId={ownerId}
                ownerName={ownerName}
                currency={currency}
                items={items}
                userIsOwner={userIsOwner}
                isHistory={isHistory}
                onReserveWish={handleReserveWish}
                onReserveError={handleReserveError}
                onCancelReservation={handleCancelReservation}
                onCancelError={handleCancelError}
                onMarkPurchasedWish={handleMarkPurchased as (wishId: string) => void}
                onMarkPurchasedError={handleMarkPurchasedError}
                onRemovePurchasedWish={handleRemovePurchased}
                onRemovePurchasedError={handleRemovePurchasedError}
                onDeleteWish={handleDeleteWish}
                onDeleteError={handleDeleteError}
                onUpdateWish={handleUpdateWish}
                onAddWish={handleAddWish}
                onProposeWish={handleProposeWish}
                onContribute={handleContribute}
                onContributeError={handleContributeError}
                totalContributed={totalContributed}
                userContributed={userContributed}
                useMock={false}
            />
        </main>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx"
git commit -m "feat: extract WishlistPageClient client component"
```

---

## Task 6: Rewrite wishlist/[id]/page.tsx as server component

**Files:**
- Modify: `src/app/[locale]/wishlist/[id]/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire file content with:

```tsx
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { TWishCard } from '@/widgets/WishCard/WishCard.types'
import WishlistPageClient from './WishlistPageClient'

type KVWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    eventDate: string
    createdAt: string
    currency?: string
    totalContributed?: number
}

type KVWish = {
    id: string
    wishlistId: string
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: 'low' | 'medium' | 'high'
    status: 'wanted' | 'purchased' | 'reserved' | 'proposed'
    purchaseUrl?: string
    notes?: string
    createdAt: string
    reservedBy?: string
    purchasedBy?: string
    proposedBy?: string
}

export default async function WishlistPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ mode?: string }>
}) {
    const { id } = await params
    const { mode } = await searchParams
    const isHistory = mode === 'history'

    const session = await getServerSession(authOptions)

    const wishlist = await kv.get<KVWishlist>(`wishlist:${id}`)
    if (!wishlist) notFound()

    const userIsOwner = session?.user?.id === wishlist.ownerId

    if (!wishlist.isPublic && !userIsOwner) redirect('/')

    const wishIds = await kv.smembers<string[]>(`wishlist:${id}:wishes`)
    const rawWishes = wishIds?.length
        ? (await Promise.all(wishIds.map((wid) => kv.get<KVWish>(`wish:${wid}`)))).filter(Boolean) as KVWish[]
        : []

    const items: TWishCard[] = rawWishes.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        price: w.price,
        currency: w.currency,
        imageUrl: w.imageUrl,
        priority: w.priority,
        status: w.status,
        purchaseUrl: w.purchaseUrl,
        notes: w.notes,
        addedDate: new Date(w.createdAt).toLocaleDateString(),
        reservedBy: w.reservedBy,
        purchasedBy: w.purchasedBy,
        isProposed: w.status === 'proposed',
    }))

    // Look up ownerName: use session name if owner, else look up via KV reverse index
    let ownerName = 'Unknown'
    if (userIsOwner && session?.user?.name) {
        ownerName = session.user.name
    } else {
        const ownerEmail = await kv.get<string>(`user:id:${wishlist.ownerId}`)
        if (ownerEmail) {
            const ownerUser = await kv.get<{ name: string }>(`user:${ownerEmail}`)
            if (ownerUser?.name) ownerName = ownerUser.name
        }
    }

    return (
        <WishlistPageClient
            id={wishlist.id}
            name={wishlist.name}
            description={wishlist.description}
            isPublic={wishlist.isPublic}
            eventDate={wishlist.eventDate}
            ownerId={wishlist.ownerId}
            ownerName={ownerName}
            currency={wishlist.currency ?? '$'}
            userIsOwner={userIsOwner}
            isHistory={isHistory}
            userId={session?.user?.id ?? ''}
            initialItems={items}
            initialTotalContributed={wishlist.totalContributed ?? 0}
            initialUserContributed={0}
        />
    )
}
```

- [ ] **Step 2: Verify the app compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit and push**

```bash
git add "src/app/[locale]/wishlist/[id]/page.tsx"
git commit -m "feat: wire wishlist detail page to real KV data"
git push
```

---

## Task 7: Smoke test the full flow

Manual verification after deploying to Vercel (or running locally with `npm run dev`).

- [ ] **Step 1: Register a new account** — go to `/register`, create an account. Verify no errors.

- [ ] **Step 2: Create a wishlist** — from `/wishlists`, open the create modal, submit. Verify the new wishlist appears in the list (not a mock one).

- [ ] **Step 3: Add a wish** — open the wishlist, add a wish. Verify it appears.

- [ ] **Step 4: Check history** — go to `/history`. Verify it shows wishlists with past event dates only (likely empty for a newly created wishlist).

- [ ] **Step 5: Check wishlist detail as guest** — copy a public wishlist URL, open it in an incognito window. Verify the wishlist loads in read-only mode (no owner controls).

- [ ] **Step 6: Commit final push if any fixes were needed**

```bash
git push
```
