import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

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

        // Drop the gift-pot side keys too so nothing is left orphaned in KV.
        await Promise.all([
            kv.del(`wish:${wishId}`),
            kv.del(`wish:${wishId}:pot`),
            kv.del(`wish:${wishId}:contributions`),
        ])
        await kv.srem(`wishlist:${wish.wishlistId}:wishes`, wishId)

        return NextResponse.json({ id: wishId, deleted: true })
    } catch (error) {
        console.error('Delete wish error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
