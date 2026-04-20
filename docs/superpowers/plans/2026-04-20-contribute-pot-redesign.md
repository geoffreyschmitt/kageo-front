# Contribute Pot Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default-on contribution pot with a creator-owned pot that a logged-in invited guest can start; gate creation behind email-based invite tracking; hide the pot from the wishlist owner entirely.

**Architecture:** A new `POST /api/wishlist/share` route records invitee emails in KV alongside sending the share email; `POST /api/wishlist/pot` creates the pot (one per wishlist) gated on invite; `GET /api/wishlist/pot` returns different payloads per caller role. Four feature areas change: `ShareWishlist` (real API call), `CreatePot` (new), `ContributePot` (updated), `PotDashboard` (new). The wishlist page is wired to the new props.

**Tech Stack:** Next.js App Router, Vercel KV, NextAuth v4, TypeScript, CSS Modules, Feature-Sliced Design

---

## File Map

### New files
- `src/app/api/wishlist/share/route.ts` — POST: record invitee email + mock email send
- `src/app/api/wishlist/pot/route.ts` — GET (fetch pot by role) + POST (create pot)
- `src/shared/api/wishlist/shareWishlist.ts` — API wrapper for share route
- `src/shared/api/wishlist/createPot.ts` — API wrapper for pot creation
- `src/shared/api/wishlist/getPot.ts` — API wrapper for pot fetch
- `src/features/CreatePot/ui/CreatePotModal.types.ts`
- `src/features/CreatePot/model.ts`
- `src/features/CreatePot/ui/CreatePotButton.tsx`
- `src/features/CreatePot/ui/CreatePotModal.tsx`
- `src/features/CreatePot/ui/CreatePotModal.module.css`
- `src/features/CreatePot/index.ts`
- `src/features/PotDashboard/ui/PotDashboard.types.ts`
- `src/features/PotDashboard/model.ts`
- `src/features/PotDashboard/ui/PotDashboard.tsx`
- `src/features/PotDashboard/ui/PotDashboard.module.css`
- `src/features/PotDashboard/index.ts`

### Modified files
- `src/shared/api/wishlist/index.ts` — add three new exports
- `src/app/api/wishlist/contribute/route.ts` — add pot-existence guard
- `src/features/ContributePot/ui/ContributeModal.types.ts` — add `creatorName`, `isLoggedIn`
- `src/features/ContributePot/ui/ContributeModal.tsx` — creator line + non-logged-in banner
- `src/features/ContributePot/ui/ContributeModal.module.css` — banner styles
- `src/pages/wishlist/wishlist.tsx` — new props + reworked pot section
- `src/app/wishlist/[id]/page.tsx` — pot state + new props

---

## Task 1: Share API route + wrapper

**Files:**
- Create: `src/app/api/wishlist/share/route.ts`
- Create: `src/shared/api/wishlist/shareWishlist.ts`
- Modify: `src/shared/api/wishlist/index.ts`

- [ ] **Step 1: Create the share API route**

Create `src/app/api/wishlist/share/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

// POST /api/wishlist/share — invite a user by email and record them as an invitee
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { wishlistId, email } = await request.json()

        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json({ message: 'A valid email is required' }, { status: 400 })
        }

        const wishlist = await kv.get<{ ownerId: string }>(`wishlist:${wishlistId}`)
        if (!wishlist) {
            return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
        }

        if (wishlist.ownerId !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        // Record invitee — sadd is idempotent
        await kv.sadd(`wishlist:${wishlistId}:invitees`, email.toLowerCase())

        // Email sending is mocked — replace with real provider when ready
        console.info(`[share] Wishlist ${wishlistId} invite sent to ${email}`)

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Share wishlist error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
```

- [ ] **Step 2: Create the shareWishlist API wrapper**

Create `src/shared/api/wishlist/shareWishlist.ts`:

```ts
export const shareWishlist = async (wishlistId: string, email: string): Promise<void> => {
    const res = await fetch('/api/wishlist/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlistId, email }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }
}
```

- [ ] **Step 3: Export from shared API index**

In `src/shared/api/wishlist/index.ts`, add at the bottom:

```ts
export { shareWishlist } from './shareWishlist'
```

- [ ] **Step 4: Verify types compile**

```bash
npm run build 2>&1 | head -30
```

Expected: no new errors (existing errors unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/wishlist/share/route.ts src/shared/api/wishlist/shareWishlist.ts src/shared/api/wishlist/index.ts
git commit -m "feat: add share API route with invitee tracking"
```

---

## Task 2: Pot API routes + wrappers

**Files:**
- Create: `src/app/api/wishlist/pot/route.ts`
- Create: `src/shared/api/wishlist/createPot.ts`
- Create: `src/shared/api/wishlist/getPot.ts`
- Modify: `src/shared/api/wishlist/index.ts`

- [ ] **Step 1: Create the pot API route**

Create `src/app/api/wishlist/pot/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishlistKV = {
    id: string
    ownerId: string
    totalContributed?: number
}

type TPotKV = {
    creatorId: string
    creatorName: string
    createdAt: string
}

type TContribution = {
    userId: string
    amount: number
    contributedAt: string
}

type TUserKV = {
    id: string
    email: string
    name: string
}

// GET /api/wishlist/pot?wishlistId={id}
// Returns different payloads depending on who is calling:
//   - owner           → 404 (pot is a surprise)
//   - no session      → { creatorName, totalContributed }
//   - contributor     → { creatorName, totalContributed, myContribution }
//   - pot creator     → { creatorName, totalContributed, myContribution, contributors }
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const wishlistId = searchParams.get('wishlistId')

    if (!wishlistId) {
        return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
    }

    const [wishlist, pot] = await Promise.all([
        kv.get<TWishlistKV>(`wishlist:${wishlistId}`),
        kv.get<TPotKV>(`wishlist:${wishlistId}:pot`),
    ])

    if (!wishlist || !pot) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const session = await getServerSession(authOptions)

    // Hide pot from owner
    if (session?.user?.id && wishlist.ownerId === session.user.id) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const totalContributed = wishlist.totalContributed ?? 0

    // Non-logged-in: public view only
    if (!session?.user?.id) {
        return NextResponse.json({ creatorName: pot.creatorName, totalContributed })
    }

    // Fetch all contributions to compute per-user total
    const rawContributions = await kv.lrange<string>(`wishlist:${wishlistId}:contributions`, 0, -1)
    const contributions: TContribution[] = rawContributions.map(c =>
        typeof c === 'string' ? JSON.parse(c) : c
    )

    const myContribution = contributions
        .filter(c => c.userId === session.user.id)
        .reduce((sum, c) => sum + c.amount, 0)

    // Pot creator gets the full contributor list
    if (pot.creatorId === session.user.id) {
        // Group contributions by userId, fetch names
        const totalsById = new Map<string, number>()
        for (const c of contributions) {
            totalsById.set(c.userId, (totalsById.get(c.userId) ?? 0) + c.amount)
        }

        const contributors = await Promise.all(
            Array.from(totalsById.entries()).map(async ([userId, amount]) => {
                const email = await kv.get<string>(`user:id:${userId}`)
                const user = email ? await kv.get<TUserKV>(`user:${email}`) : null
                return { name: user?.name ?? 'Anonymous', amount }
            })
        )

        return NextResponse.json({
            creatorId: pot.creatorId,
            creatorName: pot.creatorName,
            totalContributed,
            myContribution,
            contributors,
        })
    }

    return NextResponse.json({ creatorName: pot.creatorName, totalContributed, myContribution })
}

// POST /api/wishlist/pot — create the pot
// Guards: logged-in, not owner, email in invitees, no pot exists yet
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { wishlistId } = await request.json()
        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
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

        const isInvited = await kv.sismember(`wishlist:${wishlistId}:invitees`, userEmail)
        if (!isInvited) {
            return NextResponse.json({ message: 'You must be invited to start a pot' }, { status: 403 })
        }

        const existing = await kv.get(`wishlist:${wishlistId}:pot`)
        if (existing) {
            return NextResponse.json({ message: 'A pot already exists for this wishlist' }, { status: 409 })
        }

        const now = new Date().toISOString()
        const pot: TPotKV = {
            creatorId: session.user.id,
            creatorName: session.user.name ?? 'Someone',
            createdAt: now,
        }

        await kv.set(`wishlist:${wishlistId}:pot`, pot)

        return NextResponse.json(pot, { status: 201 })
    } catch (error) {
        console.error('Create pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
```

- [ ] **Step 2: Create createPot wrapper**

Create `src/shared/api/wishlist/createPot.ts`:

```ts
export type TCreatePotResponse = {
    creatorId: string
    creatorName: string
    createdAt: string
}

export const createPot = async (wishlistId: string): Promise<TCreatePotResponse> => {
    const res = await fetch('/api/wishlist/pot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlistId }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TCreatePotResponse
}
```

- [ ] **Step 3: Create getPot wrapper**

Create `src/shared/api/wishlist/getPot.ts`:

```ts
export type TPotContributor = { name: string; amount: number }

export type TGetPotResponse = {
    creatorId?: string
    creatorName: string
    totalContributed: number
    myContribution?: number
    contributors?: TPotContributor[]
}

export const getPot = async (wishlistId: string): Promise<TGetPotResponse | null> => {
    const res = await fetch(`/api/wishlist/pot?wishlistId=${encodeURIComponent(wishlistId)}`)

    if (res.status === 404) return null

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TGetPotResponse
}
```

- [ ] **Step 4: Export from shared API index**

In `src/shared/api/wishlist/index.ts`, add at the bottom:

```ts
export { createPot } from './createPot'
export type { TCreatePotResponse } from './createPot'

export { getPot } from './getPot'
export type { TGetPotResponse, TPotContributor } from './getPot'
```

- [ ] **Step 5: Verify types compile**

```bash
npm run build 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/wishlist/pot/route.ts src/shared/api/wishlist/createPot.ts src/shared/api/wishlist/getPot.ts src/shared/api/wishlist/index.ts
git commit -m "feat: add pot API routes (GET, POST) and API wrappers"
```

---

## Task 3: Guard the contribute route

**Files:**
- Modify: `src/app/api/wishlist/contribute/route.ts`

- [ ] **Step 1: Add pot-existence guard**

In `src/app/api/wishlist/contribute/route.ts`, after the `wishlist` existence check (around line 33), add:

```ts
const pot = await kv.get(`wishlist:${wishlistId}:pot`)
if (!pot) {
    return NextResponse.json({ message: 'No pot has been started for this wishlist' }, { status: 409 })
}
```

The full updated file becomes:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishlistKV = {
    id: string
    ownerId: string
    isPublic: boolean
    totalContributed?: number
    updatedAt: string
}

// POST /api/wishlist/contribute — add a monetary contribution to the wishlist pot
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { wishlistId, amount } = await request.json()
        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }
        const parsedAmount = Number(amount)
        if (!parsedAmount || parsedAmount <= 0) {
            return NextResponse.json({ message: 'amount must be a positive number' }, { status: 400 })
        }

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
        if (!wishlist) {
            return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
        }

        const pot = await kv.get(`wishlist:${wishlistId}:pot`)
        if (!pot) {
            return NextResponse.json({ message: 'No pot has been started for this wishlist' }, { status: 409 })
        }

        // Pot is a surprise — owner cannot contribute to their own pot
        if (wishlist.ownerId === session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        if (!wishlist.isPublic) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const now = new Date().toISOString()
        const contribution = { userId: session.user.id, amount: parsedAmount, contributedAt: now }

        await kv.lpush(`wishlist:${wishlistId}:contributions`, JSON.stringify(contribution))

        const newTotal = (wishlist.totalContributed ?? 0) + parsedAmount
        await kv.set(`wishlist:${wishlistId}`, { ...wishlist, totalContributed: newTotal, updatedAt: now })

        return NextResponse.json({ wishlistId, contribution, totalContributed: newTotal })
    } catch (error) {
        console.error('Contribute pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
```

- [ ] **Step 2: Verify types compile**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/wishlist/contribute/route.ts
git commit -m "feat: guard contribute route — pot must exist before contribution accepted"
```

---

## Task 4: CreatePot feature

**Files:**
- Create: `src/features/CreatePot/ui/CreatePotModal.types.ts`
- Create: `src/features/CreatePot/model.ts`
- Create: `src/features/CreatePot/ui/CreatePotModal.tsx`
- Create: `src/features/CreatePot/ui/CreatePotButton.tsx`
- Create: `src/features/CreatePot/ui/CreatePotModal.module.css`
- Create: `src/features/CreatePot/index.ts`

- [ ] **Step 1: Create types**

Create `src/features/CreatePot/ui/CreatePotModal.types.ts`:

```ts
export type TCreatePotModalState = 'closed' | 'login-required' | 'invite-required' | 'confirm'

export type TCreatePotButtonProps = {
    wishlistId: string
    ownerName: string
    isLoggedIn: boolean
    isInvited: boolean
    onPotCreated: (creatorId: string, creatorName: string) => void
    useMock?: boolean
}
```

- [ ] **Step 2: Create the model**

Create `src/features/CreatePot/model.ts`:

```ts
'use client'

import { useState, useCallback } from 'react'
import { createPot } from '@/shared/api/wishlist/createPot'
import type { TCreatePotModalState } from './ui/CreatePotModal.types'

type TUseCreatePotModelParams = {
    wishlistId: string
    isLoggedIn: boolean
    isInvited: boolean
    onPotCreated: (creatorId: string, creatorName: string) => void
    useMock?: boolean
}

export const useCreatePotModel = ({
    wishlistId,
    isLoggedIn,
    isInvited,
    onPotCreated,
    useMock = false,
}: TUseCreatePotModelParams) => {
    const [modalState, setModalState] = useState<TCreatePotModalState>('closed')
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const openModal = useCallback(() => {
        if (!isLoggedIn) {
            setModalState('login-required')
            return
        }
        if (!isInvited) {
            setModalState('invite-required')
            return
        }
        setModalState('confirm')
    }, [isLoggedIn, isInvited])

    const closeModal = useCallback(() => {
        setModalState('closed')
        setError(null)
    }, [])

    const handleConfirm = useCallback(async () => {
        setIsCreating(true)
        setError(null)

        try {
            if (useMock) {
                await new Promise(resolve => setTimeout(resolve, 400))
                onPotCreated('mock-creator-id', 'You')
                closeModal()
                return
            }

            const pot = await createPot(wishlistId)
            onPotCreated(pot.creatorId, pot.creatorName)
            closeModal()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create pot')
        } finally {
            setIsCreating(false)
        }
    }, [wishlistId, useMock, onPotCreated, closeModal])

    return { modalState, openModal, closeModal, isCreating, error, handleConfirm }
}
```

- [ ] **Step 3: Create the modal component**

Create `src/features/CreatePot/ui/CreatePotModal.tsx`:

```tsx
'use client'

import { Modal } from '@/shared/ui'
import type { TCreatePotModalState } from './CreatePotModal.types'
import styles from './CreatePotModal.module.css'

type TCreatePotModalProps = {
    modalState: TCreatePotModalState
    ownerName: string
    isCreating: boolean
    error: string | null
    onClose: () => void
    onConfirm: () => void
}

export const CreatePotModal = ({
    modalState,
    ownerName,
    isCreating,
    error,
    onClose,
    onConfirm,
}: TCreatePotModalProps) => {
    if (modalState === 'closed') return null

    if (modalState === 'login-required') {
        return (
            <Modal isOpen onClose={onClose} title="Start a gift pot">
                <div className={styles.createPot}>
                    <p className={styles.createPot__message}>
                        Log in to start a pot for <strong>{ownerName}</strong>. You&apos;ll also need to be
                        invited by the wishlist owner.
                    </p>
                    <div className={styles.createPot__actions}>
                        <button className={`${styles.createPot__button} ${styles['createPot__button--secondary']}`} onClick={onClose}>
                            Cancel
                        </button>
                        <a href="/login" className={`${styles.createPot__button} ${styles['createPot__button--primary']}`}>
                            Log in
                        </a>
                    </div>
                </div>
            </Modal>
        )
    }

    if (modalState === 'invite-required') {
        return (
            <Modal isOpen onClose={onClose} title="Start a gift pot">
                <div className={styles.createPot}>
                    <p className={styles.createPot__message}>
                        Only guests invited by <strong>{ownerName}</strong> can start a pot. Ask them to
                        share the wishlist with you via email.
                    </p>
                    <div className={styles.createPot__actions}>
                        <button className={`${styles.createPot__button} ${styles['createPot__button--primary']}`} onClick={onClose}>
                            Got it
                        </button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (
        <Modal isOpen onClose={onClose} title="Start a gift pot">
            <div className={styles.createPot}>
                <p className={styles.createPot__message}>
                    You&apos;ll be the organizer of a collective gift pot for <strong>{ownerName}</strong>.
                    Other guests can see that you started it and contribute anonymously.
                </p>
                {error && <p className={styles.createPot__error}>{error}</p>}
                <div className={styles.createPot__actions}>
                    <button
                        className={`${styles.createPot__button} ${styles['createPot__button--secondary']}`}
                        onClick={onClose}
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        className={`${styles.createPot__button} ${styles['createPot__button--primary']}`}
                        onClick={onConfirm}
                        disabled={isCreating}
                    >
                        {isCreating ? 'Starting…' : 'Start the pot'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
```

- [ ] **Step 4: Create the button component**

Create `src/features/CreatePot/ui/CreatePotButton.tsx`:

```tsx
'use client'

import { useCreatePotModel } from '../model'
import { CreatePotModal } from './CreatePotModal'
import type { TCreatePotButtonProps } from './CreatePotModal.types'
import styles from './CreatePotModal.module.css'

export const CreatePotButton = ({
    wishlistId,
    ownerName,
    isLoggedIn,
    isInvited,
    onPotCreated,
    useMock = false,
}: TCreatePotButtonProps) => {
    const { modalState, openModal, closeModal, isCreating, error, handleConfirm } = useCreatePotModel({
        wishlistId,
        isLoggedIn,
        isInvited,
        onPotCreated,
        useMock,
    })

    return (
        <>
            <button className={styles.createPot__triggerButton} onClick={openModal}>
                Start a gift pot
            </button>
            <CreatePotModal
                modalState={modalState}
                ownerName={ownerName}
                isCreating={isCreating}
                error={error}
                onClose={closeModal}
                onConfirm={handleConfirm}
            />
        </>
    )
}
```

- [ ] **Step 5: Create CSS**

Create `src/features/CreatePot/ui/CreatePotModal.module.css`:

```css
:root {
    --cp2-sage:       #3f6845;
    --cp2-sage-light: #eaf2eb;
    --cp2-sage-hover: #2e5033;
    --cp2-text:       #1e1a16;
    --cp2-text-2:     #4e443c;
    --cp2-border:     #d6cec4;
    --cp2-error:      #c0392b;
    --cp2-surface-2:  #f7f4ef;
    --cp2-font-sans:  var(--font-dm-sans, system-ui, sans-serif);
}

.createPot {
    padding: 24px 28px 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.createPot__message {
    font-family: var(--cp2-font-sans);
    font-size: 14px;
    color: var(--cp2-text-2);
    line-height: 1.6;
    margin: 0;
}

.createPot__message strong {
    color: var(--cp2-text);
    font-weight: 600;
}

.createPot__error {
    font-family: var(--cp2-font-sans);
    font-size: 12px;
    color: var(--cp2-error);
    margin: 0;
}

.createPot__actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.createPot__button,
a.createPot__button {
    padding: 11px 28px;
    border-radius: 100px;
    font-family: var(--cp2-font-sans);
    font-size: 13px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    text-align: center;
}

.createPot__button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.createPot__button--primary,
a.createPot__button--primary {
    background: var(--cp2-sage);
    color: #ffffff;
}

.createPot__button--primary:hover:not(:disabled) {
    background: var(--cp2-sage-hover);
}

.createPot__button--secondary {
    background: transparent;
    color: var(--cp2-text-2);
    border: 1.5px solid var(--cp2-border);
}

.createPot__button--secondary:hover:not(:disabled) {
    background: var(--cp2-surface-2);
}

.createPot__triggerButton {
    padding: 10px 24px;
    border-radius: 100px;
    font-family: var(--cp2-font-sans);
    font-size: 13px;
    font-weight: 500;
    border: 1.5px solid var(--cp2-sage);
    color: var(--cp2-sage);
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
}

.createPot__triggerButton:hover {
    background: var(--cp2-sage-light);
}
```

- [ ] **Step 6: Create index**

Create `src/features/CreatePot/index.ts`:

```ts
export { CreatePotButton } from './ui/CreatePotButton'
export type { TCreatePotButtonProps } from './ui/CreatePotModal.types'
```

- [ ] **Step 7: Verify types compile**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 8: Commit**

```bash
git add src/features/CreatePot/
git commit -m "feat: add CreatePot feature — start a gift pot button with three-state modal"
```

---

## Task 5: PotDashboard feature

**Files:**
- Create: `src/features/PotDashboard/ui/PotDashboard.types.ts`
- Create: `src/features/PotDashboard/model.ts`
- Create: `src/features/PotDashboard/ui/PotDashboard.tsx`
- Create: `src/features/PotDashboard/ui/PotDashboard.module.css`
- Create: `src/features/PotDashboard/index.ts`

- [ ] **Step 1: Create types**

Create `src/features/PotDashboard/ui/PotDashboard.types.ts`:

```ts
export type TPotContributorRow = {
    name: string
    amount: number
}

export type TPotDashboardProps = {
    totalContributed: number
    myContribution: number
    contributors: TPotContributorRow[]
    currency: string
}
```

- [ ] **Step 2: Create the model**

Create `src/features/PotDashboard/model.ts`:

```ts
'use client'

import { useState } from 'react'

export const usePotDashboardModel = () => {
    const [isExpanded, setIsExpanded] = useState(true)

    const toggle = () => setIsExpanded(prev => !prev)

    return { isExpanded, toggle }
}
```

- [ ] **Step 3: Create the component**

Create `src/features/PotDashboard/ui/PotDashboard.tsx`:

```tsx
'use client'

import { usePotDashboardModel } from '../model'
import type { TPotDashboardProps } from './PotDashboard.types'
import styles from './PotDashboard.module.css'

export const PotDashboard = ({
    totalContributed,
    myContribution,
    contributors,
    currency,
}: TPotDashboardProps) => {
    const { isExpanded, toggle } = usePotDashboardModel()

    return (
        <div className={styles.potDashboard}>
            <button className={styles.potDashboard__header} onClick={toggle} aria-expanded={isExpanded}>
                <span className={styles.potDashboard__title}>Gift pot — your overview</span>
                <span className={styles.potDashboard__total}>
                    {currency}{totalContributed.toFixed(2)} pooled
                </span>
                <svg
                    className={`${styles.potDashboard__chevron} ${isExpanded ? styles['potDashboard__chevron--open'] : ''}`}
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                >
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {isExpanded && (
                <div className={styles.potDashboard__body}>
                    {myContribution > 0 && (
                        <p className={styles.potDashboard__myContrib}>
                            Your contribution: <strong>{currency}{myContribution.toFixed(2)}</strong>
                        </p>
                    )}
                    {contributors.length === 0 ? (
                        <p className={styles.potDashboard__empty}>No contributions yet.</p>
                    ) : (
                        <ul className={styles.potDashboard__list}>
                            {contributors.map((c, i) => (
                                <li key={i} className={styles.potDashboard__row}>
                                    <span className={styles.potDashboard__name}>{c.name}</span>
                                    <span className={styles.potDashboard__amount}>{currency}{c.amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 4: Create CSS**

Create `src/features/PotDashboard/ui/PotDashboard.module.css`:

```css
:root {
    --pd-sage:       #3f6845;
    --pd-sage-light: #eaf2eb;
    --pd-text:       #1e1a16;
    --pd-text-2:     #4e443c;
    --pd-text-3:     #6b6258;
    --pd-border:     #d6cec4;
    --pd-surface-2:  #f7f4ef;
    --pd-font-sans:  var(--font-dm-sans, system-ui, sans-serif);
    --pd-font-serif: var(--font-cormorant, Georgia, serif);
}

.potDashboard {
    border: 1px solid var(--pd-border);
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
}

.potDashboard__header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: var(--pd-sage-light);
    border: none;
    cursor: pointer;
    text-align: left;
}

.potDashboard__title {
    font-family: var(--pd-font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--pd-sage);
    flex: 1;
}

.potDashboard__total {
    font-family: var(--pd-font-sans);
    font-size: 13px;
    font-weight: 700;
    color: var(--pd-sage);
}

.potDashboard__chevron {
    flex-shrink: 0;
    color: var(--pd-sage);
    transition: transform 0.2s;
}

.potDashboard__chevron--open {
    transform: rotate(180deg);
}

.potDashboard__body {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.potDashboard__myContrib {
    font-family: var(--pd-font-sans);
    font-size: 13px;
    color: var(--pd-text-2);
    margin: 0;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--pd-border);
}

.potDashboard__myContrib strong {
    color: var(--pd-sage);
}

.potDashboard__empty {
    font-family: var(--pd-font-sans);
    font-size: 13px;
    color: var(--pd-text-3);
    margin: 0;
}

.potDashboard__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.potDashboard__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.potDashboard__name {
    font-family: var(--pd-font-sans);
    font-size: 13px;
    color: var(--pd-text-2);
}

.potDashboard__amount {
    font-family: var(--pd-font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--pd-text);
}
```

- [ ] **Step 5: Create index**

Create `src/features/PotDashboard/index.ts`:

```ts
export { PotDashboard } from './ui/PotDashboard'
export type { TPotDashboardProps, TPotContributorRow } from './ui/PotDashboard.types'
```

- [ ] **Step 6: Verify types compile**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 7: Commit**

```bash
git add src/features/PotDashboard/
git commit -m "feat: add PotDashboard feature — collapsible creator view of contributors"
```

---

## Task 6: Update ContributePot feature

**Files:**
- Modify: `src/features/ContributePot/ui/ContributeModal.types.ts`
- Modify: `src/features/ContributePot/ui/ContributeModal.tsx`
- Modify: `src/features/ContributePot/ui/ContributeModal.module.css`

- [ ] **Step 1: Update types**

Replace the content of `src/features/ContributePot/ui/ContributeModal.types.ts`:

```ts
export type TContributeModal = {
    isOpen: boolean
    onClose: () => void
    wishlistId: string
    eventName: string
    ownerName: string
    creatorName: string
    totalContributed: number
    userContributed?: number
    currency: string
    isLoggedIn: boolean
    onContribute?: (wishlistId: string, amount: number) => void
    onError?: (wishlistId: string, amount: number) => void
    useMock?: boolean
}
```

- [ ] **Step 2: Update ContributeModal component**

Replace the content of `src/features/ContributePot/ui/ContributeModal.tsx`:

```tsx
'use client'

import { Modal } from '@/shared/ui'
import { useContributePotModel } from '../model'
import type { TContributeModal } from './ContributeModal.types'
import styles from './ContributeModal.module.css'

export const ContributeModal = ({
    isOpen,
    onClose,
    wishlistId,
    eventName,
    ownerName,
    creatorName,
    totalContributed,
    userContributed = 0,
    currency,
    isLoggedIn,
    onContribute,
    onError,
    useMock = false,
}: TContributeModal) => {
    const { amount, setAmount, isSubmitting, error, handleSubmit } = useContributePotModel({
        wishlistId,
        onContribute,
        onError,
        onClose,
        useMock,
    })

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<span className={styles.contribute__modalTitle}>Gift to the pot</span>}
            subtitle={eventName}
        >
            <div className={styles.contribute}>
                <div className={styles.contribute__hero}>
                    <div className={styles.contribute__heroIcon} aria-hidden="true">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="24" cy="24" r="22" fill="#eaf2eb" stroke="#b8dbb9" strokeWidth="1.2"/>
                            <path d="M24 33 Q18 27 16 21 Q14 15 20 13 Q23 12 25 16 Q27 12 30 13 Q36 15 28 25 Q27 27 24 33Z" fill="#3f6845" opacity="0.75"/>
                            <path d="M24 33 Q24 26 24 20" stroke="#3f6845" strokeWidth="1.2" opacity="0.5" strokeLinecap="round"/>
                            <path d="M24 23 Q21 20 18 18" stroke="#3f6845" strokeWidth="1" opacity="0.4" strokeLinecap="round"/>
                            <path d="M24 27 Q27 24 30 22" stroke="#3f6845" strokeWidth="1" opacity="0.4" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div className={styles.contribute__heroText}>
                        <p className={styles.contribute__heroMessage}>
                            A collective gift for <strong>{ownerName}</strong>
                        </p>
                        <p className={styles.contribute__heroOrganizer}>
                            Organised by {creatorName}
                        </p>
                        {totalContributed > 0 ? (
                            <p className={styles.contribute__heroSub}>
                                {currency}{totalContributed.toFixed(2)} already pooled by friends
                            </p>
                        ) : (
                            <p className={styles.contribute__heroSub}>
                                Be the first to add to the pot
                            </p>
                        )}
                        {userContributed > 0 && (
                            <p className={styles.contribute__heroUserContrib}>
                                You&apos;ve gifted {currency}{userContributed.toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>

                {!isLoggedIn ? (
                    <div className={styles.contribute__loginBanner}>
                        <p className={styles.contribute__loginBannerText}>
                            Log in to contribute to this pot.
                        </p>
                        <a href="/login" className={styles.contribute__loginBannerLink}>
                            Log in
                        </a>
                    </div>
                ) : (
                    <>
                        <div className={styles.contribute__field}>
                            <label className={styles.contribute__label} htmlFor="contribute-amount">
                                Your contribution
                            </label>
                            <div className={styles.contribute__amountWrap}>
                                <span className={styles.contribute__currency}>{currency}</span>
                                <input
                                    id="contribute-amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className={`${styles.contribute__input} ${error ? styles['contribute__input--error'] : ''}`}
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                            </div>
                            {error && <p className={styles.contribute__error}>{error}</p>}
                        </div>

                        <div className={styles.contribute__actions}>
                            <button
                                className={`${styles.contribute__button} ${styles['contribute__button--secondary']}`}
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${styles.contribute__button} ${styles['contribute__button--primary']}`}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending…' : 'Send gift'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
```

- [ ] **Step 3: Add login banner styles**

In `src/features/ContributePot/ui/ContributeModal.module.css`, add after the last block (before the closing `@media` rule — insert before line `@media (max-width: 768px)`):

```css
/* ── Login banner (non-logged-in view) ──────── */

.contribute__heroOrganizer {
    font-family: var(--cp-font-sans);
    font-size: 12px;
    color: var(--cp-text-3);
    margin: 0;
    line-height: 1.4;
}

.contribute__loginBanner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--cp-surface-2);
    border: 1px solid var(--cp-border);
    border-radius: 10px;
    padding: 14px 18px;
}

.contribute__loginBannerText {
    font-family: var(--cp-font-sans);
    font-size: 13px;
    color: var(--cp-text-2);
    margin: 0;
}

.contribute__loginBannerLink {
    font-family: var(--cp-font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--cp-sage);
    text-decoration: none;
    white-space: nowrap;
}

.contribute__loginBannerLink:hover {
    text-decoration: underline;
}
```

- [ ] **Step 4: Verify types compile**

```bash
npm run build 2>&1 | head -40
```

Expected: errors only for the not-yet-updated wishlist page (missing `creatorName`, `isLoggedIn` props on `ContributeModal`). Fix those in Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/features/ContributePot/
git commit -m "feat: update ContributePot — add creator name, login-gate banner for non-authenticated users"
```

---

## Task 7: Wire up the wishlist page

**Files:**
- Modify: `src/pages/wishlist/wishlist.tsx`
- Modify: `src/app/wishlist/[id]/page.tsx`

- [ ] **Step 1: Add pot types and update TWishlistPageProps**

At the top of `src/pages/wishlist/wishlist.tsx`, add this type before `TWishlistPageProps`:

```ts
export type TPotData = {
  creatorId: string
  creatorName: string
  totalContributed: number
  myContribution: number
  contributors?: { name: string; amount: number }[]
} | null
```

In `TWishlistPageProps`, replace:
```ts
  totalContributed?: number
  userContributed?: number
```
with:
```ts
  pot?: TPotData
  isInvited?: boolean
  isLoggedIn?: boolean
```

- [ ] **Step 2: Update imports in wishlist.tsx**

Replace the import line:
```ts
import {ContributeModal} from '@/features/ContributePot'
```
with:
```ts
import {ContributeModal} from '@/features/ContributePot'
import {CreatePotButton} from '@/features/CreatePot'
import {PotDashboard} from '@/features/PotDashboard'
```

Also remove the import of `mockShareWishlistByEmail`:
```ts
import {ShareWishlistModal, mockShareWishlistByEmail} from '@/features/ShareWishlist'
```
becomes:
```ts
import {ShareWishlistModal} from '@/features/ShareWishlist'
```

Add the import for `shareWishlist`:
```ts
import {shareWishlist} from '@/shared/api/wishlist'
```

- [ ] **Step 3: Update destructured props and defaults**

In the `Wishlist` function signature, replace:
```ts
  onContribute,
  onContributeError,
  totalContributed = 0,
  userContributed = 0,
  useMock = false,
```
with:
```ts
  onContribute,
  onContributeError,
  pot = null,
  isInvited = false,
  isLoggedIn = false,
  useMock = false,
```

- [ ] **Step 4: Replace handleSendShareEmail**

Replace:
```ts
  const handleSendShareEmail: (email: string, url: string) => Promise<void> = async (email, url) => {
    return mockShareWishlistByEmail(email, url)
  }
```
with:
```ts
  const handleSendShareEmail = async (email: string, _url: string): Promise<void> => {
    await shareWishlist(id, email)
  }
```

- [ ] **Step 5: Replace the pot section in the JSX**

Find and replace the existing pot section (the block starting with `{!userIsOwner && !isHistory && (` that contains `wishlist__pot`):

Replace that entire block with:

```tsx
{!userIsOwner && !isHistory && (
  <div className={styles.wishlist__pot}>
    {pot ? (
      <>
        {pot.creatorId === user.id ? (
          <PotDashboard
            totalContributed={pot.totalContributed}
            myContribution={pot.myContribution}
            contributors={pot.contributors ?? []}
            currency={currency}
          />
        ) : (
          <div className={styles.wishlist__potInner}>
            <div className={styles.wishlist__potIcon} aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r="16" fill="#eaf2eb" stroke="#b8dbb9" strokeWidth="1.2"/>
                <path d="M18 27 Q13 22 11 17 Q9 12 14 10 Q17 9 19 13 Q21 9 24 10 Q29 12 22 21 Q21 23 18 27Z" fill="#3f6845" opacity="0.7"/>
                <path d="M18 27 Q18 21 18 16" stroke="#3f6845" strokeWidth="1" opacity="0.45" strokeLinecap="round"/>
                <path d="M18 18 Q15 15 12 14" stroke="#3f6845" strokeWidth="0.9" opacity="0.35" strokeLinecap="round"/>
                <path d="M18 22 Q21 19 24 18" stroke="#3f6845" strokeWidth="0.9" opacity="0.35" strokeLinecap="round"/>
              </svg>
            </div>
            <div className={styles.wishlist__potText}>
              <p className={styles.wishlist__potTitle}>Gift pot</p>
              <p className={styles.wishlist__potSub}>
                Organised by {pot.creatorName}
                {pot.totalContributed > 0
                  ? <> · <strong>{currency}{pot.totalContributed.toFixed(2)}</strong> pooled</>
                  : null
                }
              </p>
              {pot.myContribution > 0 && (
                <p className={styles.wishlist__potUserContrib}>
                  You&apos;ve gifted <strong>{currency}{pot.myContribution.toFixed(2)}</strong>
                </p>
              )}
            </div>
            <button
              className={`${styles.wishlist__button} ${styles['wishlist__button--pot']}`}
              onClick={() => setIsContributeModalOpen(true)}
            >
              Contribute to the pot
            </button>
          </div>
        )}
      </>
    ) : (
      <CreatePotButton
        wishlistId={id}
        ownerName={ownerName}
        isLoggedIn={isLoggedIn}
        isInvited={isInvited}
        onPotCreated={(creatorId, creatorName) => {
          eventBus.emit('ui:toast', { message: 'Gift pot started!', type: 'success' })
          // Page-level state update handled via onContribute callback pattern
          // For now, refresh the page to reflect new pot state
          window.location.reload()
        }}
        useMock={useMock}
      />
    )}
  </div>
)}
```

- [ ] **Step 6: Update ContributeModal usage**

Find the `ContributeModal` usage (around line 722–736) and replace with:

```tsx
{!isHistory && !userIsOwner && pot && pot.creatorId !== user.id && (
  <ContributeModal
    isOpen={isContributeModalOpen}
    onClose={() => setIsContributeModalOpen(false)}
    wishlistId={id}
    eventName={name}
    ownerName={ownerName}
    creatorName={pot.creatorName}
    totalContributed={pot.totalContributed}
    userContributed={pot.myContribution}
    currency={currency}
    isLoggedIn={isLoggedIn}
    onContribute={onContribute}
    onError={onContributeError}
    useMock={useMock}
  />
)}
```

- [ ] **Step 7: Update the page component**

Replace the content of `src/app/wishlist/[id]/page.tsx` with:

```tsx
'use client'

import {use, useState} from 'react'

import Wishlist from '@/pages/wishlist/wishlist'
import type {TPotData} from '@/pages/wishlist/wishlist'
import {mockUserPrivate} from '@/entities/user';
import type {TWishCard} from '@/widgets/WishCard/WishCard.types';
import type {TWishFormData, TProposedWishFormData} from '@/entities/wish';
import {eventBus} from '@/shared/eventBus';

const sampleOwnerWishlistData = {
    id: '1',
    name: 'Birthday Wishlist 2024',
    description:
        'All the amazing things I\'m hoping to get for my birthday this year. From the latest tech gadgets to cozy home decor, this list has everything that would make my special day even more memorable!',
    isPublic: true,
    eventDate: 'August 15, 2026',
    ownerId: '1',
    ownerName: 'Sarah Johnson',
    totalValue: 1247.5,
    currency: '$',
    items: [
        {
            id: '1',
            name: 'Wireless Noise-Cancelling Headphones',
            description:
                'Premium over-ear headphones with active noise cancellation, perfect for work and travel. Features 30-hour battery life and premium sound quality.',
            price: 299.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'high' as const,
            status: 'wanted' as const,
            purchaseUrl: 'https://example.com/headphones',
            notes: 'Prefer black or silver color. Sony or Bose brand preferred.',
            addedDate: '2 weeks ago',
        },
        {
            id: '2',
            name: 'Smart Fitness Watch',
            description:
                'Advanced fitness tracker with heart rate monitoring, GPS, and sleep tracking. Water-resistant design perfect for all activities.',
            price: 399.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'high' as const,
            status: 'reserved' as const,
            reservedBy: mockUserPrivate.id,
            notes: 'Size medium, prefer sport band in blue or black.',
            addedDate: '1 week ago',
        },
        {
            id: '3',
            name: 'Cozy Reading Chair',
            description:
                'Comfortable armchair perfect for reading sessions. Soft fabric upholstery with excellent back support and a matching ottoman.',
            price: 449.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'medium' as const,
            status: 'wanted' as const,
            purchaseUrl: 'https://example.com/chair',
            notes: 'Neutral colors preferred - beige, gray, or cream.',
            addedDate: '3 weeks ago',
        },
        {
            id: '4',
            name: 'Professional Coffee Maker',
            description:
                'High-end espresso machine with built-in grinder. Makes café-quality coffee at home with programmable settings.',
            price: 89.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'low' as const,
            status: 'purchased' as const,
            addedDate: '1 month ago',
        },
        {
            id: '5',
            name: 'Kindle E-Reader',
            description:
                'Latest generation e-reader with adjustable warm light, waterproof design, and weeks of battery life. Perfect for reading anywhere.',
            price: 139.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'medium' as const,
            status: 'wanted' as const,
            purchaseUrl: 'https://example.com/kindle',
            notes: '32GB storage preferred. Include a nice case if possible.',
            addedDate: '5 days ago',
        },
        {
            id: '6',
            name: 'Yoga Mat Set',
            description:
                'Premium yoga mat with alignment lines, carrying strap, and matching blocks. Non-slip surface and eco-friendly materials.',
            price: 67.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'low' as const,
            status: 'wanted' as const,
            purchaseUrl: 'https://example.com/yoga-mat',
            addedDate: '1 week ago',
        },
        {
            id: '8',
            name: 'Art Supplies Set',
            description:
                'Professional art supplies set including high-quality brushes, paints, and canvas. Perfect for exploring artistic creativity.',
            price: 45.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'medium' as const,
            status: 'wanted' as const,
            notes: 'Watercolor or acrylic set preferred.',
            addedDate: '3 days ago',
        },
    ],
}

const sampleGuestWishlistData = {
    ...sampleOwnerWishlistData,
    items: [
        ...sampleOwnerWishlistData.items,
        {
            id: '7',
            name: 'Smart Home Security System',
            description: 'Complete home security system with cameras, motion sensors, and smartphone integration. Easy DIY installation and 24/7 monitoring capabilities.',
            price: 299.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'medium' as const,
            status: 'proposed' as const,
            isProposed: true,
            purchaseUrl: 'https://example.com/security-system',
            notes: 'Looking for a system compatible with existing smart home setup.',
            addedDate: '2 days ago',
        },
    ],
}

// Mock pot states:
//   id === 'shared'         → guest contributor view (pot exists, user is contributor)
//   id === 'no-pot'         → invited guest, no pot yet (CreatePot button shown)
//   id === 'shared-creator' → guest is the pot creator (PotDashboard shown)
//   anything else           → owner view (nothing pot-related)
const mockPotContributor: TPotData = {
    creatorId: 'mock-creator',
    creatorName: 'Emma Wilson',
    totalContributed: 47.50,
    myContribution: 20.00,
}

const mockPotCreator: TPotData = {
    creatorId: mockUserPrivate.id,
    creatorName: 'You',
    totalContributed: 67.50,
    myContribution: 20.00,
    contributors: [
        { name: 'Alex Martin', amount: 20.00 },
        { name: 'Sam Lee', amount: 27.50 },
        { name: 'You', amount: 20.00 },
    ],
}

export default function WishlistPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ mode?: string }>
}) {
    const { id } = use(params)
    const { mode } = use(searchParams)
    const isHistory = mode === 'history'

    const userIsOwner = id !== 'shared' && id !== 'no-pot' && id !== 'shared-creator'
    const isInvited = id === 'shared' || id === 'no-pot' || id === 'shared-creator'
    const isLoggedIn = true // always logged in in mock

    const initialPot: TPotData = (() => {
        if (id === 'shared') return mockPotContributor
        if (id === 'shared-creator') return mockPotCreator
        return null
    })()

    const [items, setItems] = useState<TWishCard[]>(
        userIsOwner ? sampleOwnerWishlistData.items : sampleGuestWishlistData.items
    )
    const [pot, setPot] = useState<TPotData>(initialPot)

    const user = mockUserPrivate

    const toast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') =>
        eventBus.emit('ui:toast', { message, type })

    const handleReserveWish = (wishId: string, reservedBy: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId ? {...item, status: 'reserved', reservedBy} : item
        ))
        const name = items.find(i => i.id === wishId)?.name
        toast(name ? `"${name}" reserved` : 'Wish reserved', 'success')
    }

    const handleReserveError = (wishId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId
                ? {...item, status: item.isProposed ? 'proposed' : 'wanted', reservedBy: undefined}
                : item
        ))
        toast('Could not reserve wish — please try again', 'error')
    }

    const handleCancelReservation = (wishId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId ? {...item, status: 'wanted', reservedBy: undefined} : item
        ))
        toast('Reservation cancelled', 'info')
    }

    const handleCancelError = (wishId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId ? {...item, status: 'reserved', reservedBy: user.id} : item
        ))
        toast('Could not cancel reservation — please try again', 'error')
    }

    const handleMarkPurchased = (wishId: string, userId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId ? {...item, status: 'purchased', purchasedBy: userId} : item
        ))
        const name = items.find(i => i.id === wishId)?.name
        toast(name ? `"${name}" marked as purchased` : 'Wish marked as purchased', 'success')
    }

    const handleMarkPurchasedError = (wishId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === wishId) {
                return {...item, status: item.reservedBy ? 'reserved' : 'wanted', purchasedBy: undefined}
            }
            return item
        }))
        toast('Could not mark as purchased — please try again', 'error')
    }

    const handleRemovePurchased = (wishId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId ? {...item, status: 'wanted', purchasedBy: undefined} : item
        ))
        toast('Marked as available again', 'info')
    }

    const handleRemovePurchasedError = (wishId: string) => {
        const initialItems = userIsOwner ? sampleOwnerWishlistData.items : sampleGuestWishlistData.items
        setItems(prev => prev.map(item => {
            if (item.id === wishId) {
                const original = initialItems.find(o => o.id === wishId)
                return {...item, status: 'purchased', purchasedBy: (original as any)?.purchasedBy}
            }
            return item
        }))
        toast('Could not update wish — please try again', 'error')
    }

    const handleEditWish = (wish: TWishCard) => {
        console.log('Edit wish clicked:', wish)
    }

    const handleUpdateWish = (wishId: string, updatedWish: TWishFormData & { id: string }) => {
        setItems(prev => prev.map(item =>
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

    const handleDeleteWish = (wishId: string) => {
        const name = items.find(i => i.id === wishId)?.name
        setItems(prev => prev.filter(item => item.id !== wishId))
        toast(name ? `"${name}" deleted` : 'Wish deleted', 'info')
    }

    const handleContribute = (_wishlistId: string, amount: number) => {
        setPot(prev => prev
            ? { ...prev, totalContributed: prev.totalContributed + amount, myContribution: prev.myContribution + amount }
            : prev
        )
        toast('Thank you! Your gift has been added to the pot', 'success')
    }

    const handleContributeError = (_wishlistId: string, amount: number) => {
        setPot(prev => prev
            ? { ...prev, totalContributed: prev.totalContributed - amount, myContribution: prev.myContribution - amount }
            : prev
        )
        toast('Could not add your contribution — please try again', 'error')
    }

    const handleDeleteError = (wishId: string) => {
        const initialItems = userIsOwner ? sampleOwnerWishlistData.items : sampleGuestWishlistData.items
        const originalWish = initialItems.find(item => item.id === wishId)
        if (originalWish) {
            setItems(prev => [...prev, originalWish])
        }
        toast('Could not delete wish — please try again', 'error')
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
        setItems(prev => [...prev, newWishCard])
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
        setItems(prev => [...prev, newWishCard])
    }

    return (
        <main>
            <Wishlist
                {...sampleOwnerWishlistData}
                items={items}
                userIsOwner={userIsOwner}
                isHistory={isHistory}
                pot={pot}
                isInvited={isInvited}
                isLoggedIn={isLoggedIn}
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
                onEditWish={handleEditWish}
                onUpdateWish={handleUpdateWish}
                onAddWish={handleAddWish}
                onProposeWish={handleProposeWish}
                onContribute={handleContribute}
                onContributeError={handleContributeError}
                useMock={true}
            />
        </main>
    )
}
```

- [ ] **Step 8: Verify full build passes**

```bash
npm run build 2>&1 | head -50
```

Expected: clean build with no type errors.

- [ ] **Step 9: Manual smoke test**

Start the dev server:
```bash
npm run dev
```

Check these URLs:
- `/wishlist/1` → owner view — no pot section visible
- `/wishlist/shared` → contributor view — pot banner + "Contribute to the pot" button visible, clicking opens modal with "Organised by Emma Wilson"
- `/wishlist/no-pot` → invited guest, no pot — "Start a gift pot" button visible, clicking opens confirmation modal
- `/wishlist/shared-creator` → creator view — PotDashboard shows contributor list

- [ ] **Step 10: Commit**

```bash
git add src/pages/wishlist/wishlist.tsx src/app/wishlist/[id]/page.tsx
git commit -m "feat: wire pot redesign into wishlist page — CreatePot, PotDashboard, updated ContributeModal"
```
