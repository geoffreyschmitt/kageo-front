import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { queueListReplace } from '@/shared/lib/kvCascade'
import { LockTimeoutError, busyResponse, withLock, wishlistLock } from '@/shared/lib/kvLock'
import { getWishlistAccess } from '@/shared/lib/wishlistAccess'

import { parseContributions } from '../pot/readPot'

type TWishlistKV = {
    id: string
    ownerId: string
    isPublic: boolean
    totalContributed?: number
    updatedAt: string
}

type TContribution = { userId: string; amount: number; contributedAt: string }


type TContributeContext = {
    userId: string
    wishlistId: string
    amount: number
    wishlist: TWishlistKV
}

// Shared guards for POST (add) and PATCH (replace): the caller must be a
// logged-in non-owner, on a public wishlist that already has a pot.
// `allowZero` is true for PATCH — a 0 pledge cancels the caller's participation.
const loadContext = async (
    request: NextRequest,
    { allowZero = false }: { allowZero?: boolean } = {},
): Promise<{ ctx: TContributeContext } | { error: NextResponse }> => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) }
    }

    const { wishlistId, amount } = await request.json()
    if (!wishlistId) {
        return { error: NextResponse.json({ message: 'wishlistId is required' }, { status: 400 }) }
    }
    const parsedAmount = Number(amount)
    const invalid = Number.isNaN(parsedAmount) || parsedAmount < 0 || (!allowZero && parsedAmount <= 0)
    if (invalid) {
        return {
            error: NextResponse.json(
                { message: allowZero ? 'amount must be zero or a positive number' : 'amount must be a positive number' },
                { status: 400 },
            ),
        }
    }

    const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
    if (!wishlist) {
        return { error: NextResponse.json({ message: 'Wishlist not found' }, { status: 404 }) }
    }

    // The owner is refused before the pot is read: a 409-vs-403 split would otherwise
    // tell them whether a (surprise) pot exists on their own wishlist.
    if (wishlist.ownerId === session.user.id) {
        return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
    }

    const pot = await kv.get(`wishlist:${wishlistId}:pot`)
    if (!pot) {
        return { error: NextResponse.json({ message: 'No pot has been started for this wishlist' }, { status: 409 }) }
    }

    // Anyone on a public list, or a guest invited to a private one.
    const { canView } = await getWishlistAccess(wishlist, session.user)
    if (!canView) {
        return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
    }

    return { ctx: { userId: session.user.id, wishlistId, amount: parsedAmount, wishlist } }
}

// POST /api/wishlist/contribute — add a monetary pledge to the wishlist pot
export async function POST(request: NextRequest) {
    try {
        const loaded = await loadContext(request)
        if ('error' in loaded) return loaded.error
        const { userId, wishlistId, amount, wishlist } = loaded.ctx

        const now = new Date().toISOString()
        const contribution: TContribution = { userId, amount, contributedAt: now }

        const newTotal = await withLock(wishlistLock(wishlistId), async () => {
            // Re-read inside the lock: the total and the rest of the record may have moved.
            const fresh = (await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)) ?? wishlist
            await kv.lpush(`wishlist:${wishlistId}:contributions`, JSON.stringify(contribution))
            const total = (fresh.totalContributed ?? 0) + amount
            await kv.set(`wishlist:${wishlistId}`, { ...fresh, totalContributed: total, updatedAt: now })
            return total
        })

        return NextResponse.json({ wishlistId, contribution, totalContributed: newTotal })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Contribute pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/wishlist/contribute — replace the caller's own pledge with a new
// amount. `amount: 0` removes the pledge entirely (cancel). The
// read-modify-write runs under a per-pot lock so concurrent pledges don't lose updates.
export async function PATCH(request: NextRequest) {
    try {
        const loaded = await loadContext(request, { allowZero: true })
        if ('error' in loaded) return loaded.error
        const { userId, wishlistId, amount, wishlist } = loaded.ctx

        const key = `wishlist:${wishlistId}:contributions`
        const newTotal = await withLock(wishlistLock(wishlistId), async () => {
            const fresh = (await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)) ?? wishlist
            const existing = parseContributions(await kv.lrange<string>(key, 0, -1))

            const mine = existing
                .filter((c) => c.userId === userId)
                .reduce((sum, c) => sum + c.amount, 0)
            const others = existing.filter((c) => c.userId !== userId)

            const now = new Date().toISOString()
            const next =
                amount > 0
                    ? [...others, { userId, amount, contributedAt: now } as TContribution]
                    : others

            const total = Math.max(0, (fresh.totalContributed ?? 0) - mine + amount)
            const tx = kv.multi()
            queueListReplace(tx, key, next.map((c) => JSON.stringify(c)))
            tx.set(`wishlist:${wishlistId}`, { ...fresh, totalContributed: total, updatedAt: now })
            await tx.exec()
            return total
        })

        return NextResponse.json({ wishlistId, totalContributed: newTotal, myContribution: amount })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Edit contribution error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
