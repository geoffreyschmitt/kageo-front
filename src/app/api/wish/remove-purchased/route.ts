import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishKV = { id: string; status: string; purchasedBy?: string; reservedBy?: string; wishlistId: string }
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

        return NextResponse.json({ id: wishId, status: revertedStatus, purchasedBy: undefined })
    } catch (error) {
        console.error('Remove purchased error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
