import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishKV = { id: string; status: string; wishlistId: string }
type TWishlistKV = { isPublic: boolean; ownerId: string }

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
        if (!wishlist || (!wishlist.isPublic && wishlist.ownerId !== session.user.id)) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        if (wish.status !== 'wanted' && wish.status !== 'proposed') {
            return NextResponse.json({ message: 'Wish is not available for reservation' }, { status: 409 })
        }

        const updated = { ...wish, status: 'reserved', reservedBy: session.user.id, updatedAt: new Date().toISOString() }
        await kv.set(`wish:${wishId}`, updated)

        return NextResponse.json({ id: wishId, status: 'reserved', reservedBy: session.user.id })
    } catch (error) {
        console.error('Reserve wish error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
