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
    // The owner is refused before the pot is read: a 409-vs-403 split would
    // otherwise tell them whether a (surprise) pot exists on their own wish.
    if (wishlist.ownerId === session.user.id) {
        return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
    }
    const pot = await kv.get(`wish:${wishId}:pot`)
    if (!pot) {
        return { error: NextResponse.json({ message: 'No pot has been started for this wish' }, { status: 409 }) }
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
