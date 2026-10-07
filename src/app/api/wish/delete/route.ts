import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { queueWishDeletion } from '@/shared/lib/kvCascade'

type TWishKV = { id: string; wishlistId: string }
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

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
        if (!wishlist || wishlist.ownerId !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        // One transaction: the wish, its pot, pledges and comments go together.
        const tx = kv.multi()
        queueWishDeletion(tx, wishId)
        tx.srem(`wishlist:${wish.wishlistId}:wishes`, wishId)
        await tx.exec()

        return NextResponse.json({ id: wishId, deleted: true })
    } catch (error) {
        console.error('Delete wish error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
