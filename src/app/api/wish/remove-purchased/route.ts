import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { parseContributions } from '@/app/api/wishlist/pot/readPot'
import { reconcileFundedStatus } from '@/app/api/wish/pot/reconcileFundedStatus'

type TWishKV = {
    id: string
    status: string
    price?: number
    purchasedBy?: string
    reservedBy?: string
    wishlistId: string
}
type TWishlistKV = { ownerId: string }

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

        if (wish.status !== 'purchased') {
            return NextResponse.json({ message: 'Wish is not purchased' }, { status: 409 })
        }

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
        // Allow both the purchaser and the wishlist owner to remove purchased status
        if (!wishlist || (wish.purchasedBy !== session.user.id && wishlist.ownerId !== session.user.id)) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const { purchasedBy: _p, ...rest } = wish
        // Revert to the state the wish was in before it was marked purchased:
        // back to reserved if it still holds a reservation, otherwise wanted.
        const revertedStatus = rest.reservedBy ? 'reserved' : 'wanted'
        const updated = { ...rest, status: revertedStatus, updatedAt: new Date().toISOString() }
        await kv.set(`wish:${wishId}`, updated)

        // A gift pot that is still full must land back on 'funded', not 'wanted'.
        let finalStatus: string = revertedStatus
        const pot = await kv.get(`wish:${wishId}:pot`)
        if (pot) {
            const all = parseContributions(await kv.lrange<string>(`wish:${wishId}:contributions`, 0, -1))
            const byUser = new Map<string, number>()
            for (const c of all) byUser.set(c.userId, (byUser.get(c.userId) ?? 0) + c.amount)
            const total = Array.from(byUser.values()).filter((v) => v > 0).reduce((s, v) => s + v, 0)

            const next = reconcileFundedStatus(revertedStatus, total, rest.price ?? 0)
            if (next) {
                finalStatus = next
                await kv.set(`wish:${wishId}`, { ...updated, status: next })
            }
        }

        return NextResponse.json({ id: wishId, status: finalStatus, purchasedBy: undefined })
    } catch (error) {
        console.error('Remove purchased error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
