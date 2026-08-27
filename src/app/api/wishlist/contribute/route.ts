import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
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

    const pot = await kv.get(`wishlist:${wishlistId}:pot`)
    if (!pot) {
        return { error: NextResponse.json({ message: 'No pot has been started for this wishlist' }, { status: 409 }) }
    }

    // Pot is a surprise — owner cannot contribute to their own pot
    if (wishlist.ownerId === session.user.id) {
        return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
    }

    if (!wishlist.isPublic) {
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

        await kv.lpush(`wishlist:${wishlistId}:contributions`, JSON.stringify(contribution))

        const newTotal = (wishlist.totalContributed ?? 0) + amount
        await kv.set(`wishlist:${wishlistId}`, { ...wishlist, totalContributed: newTotal, updatedAt: now })

        return NextResponse.json({ wishlistId, contribution, totalContributed: newTotal })
    } catch (error) {
        console.error('Contribute pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/wishlist/contribute — replace the caller's own pledge with a new
// amount. `amount: 0` removes the pledge entirely (cancel). Read-modify-write on
// the list, matching the non-atomic pattern of POST — fine at this app's scale.
export async function PATCH(request: NextRequest) {
    try {
        const loaded = await loadContext(request, { allowZero: true })
        if ('error' in loaded) return loaded.error
        const { userId, wishlistId, amount, wishlist } = loaded.ctx

        const key = `wishlist:${wishlistId}:contributions`
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

        await kv.del(key)
        if (next.length) {
            await kv.rpush(key, ...next.map((c) => JSON.stringify(c)))
        }

        const newTotal = Math.max(0, (wishlist.totalContributed ?? 0) - mine + amount)
        await kv.set(`wishlist:${wishlistId}`, { ...wishlist, totalContributed: newTotal, updatedAt: now })

        return NextResponse.json({ wishlistId, totalContributed: newTotal, myContribution: amount })
    } catch (error) {
        console.error('Edit contribution error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
