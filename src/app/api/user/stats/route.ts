import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type KVWishlist = {
    id: string
    ownerId: string
}

// GET /api/user/stats — counts for the profile page
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const ownedIds = (await kv.smembers<string[]>(`user:${userId}:wishlists`)) ?? []
    const sharedIds = session.user.email
        ? (await kv.smembers<string[]>(`email:${session.user.email.toLowerCase()}:invitedWishlists`)) ?? []
        : []

    const ownedWishlists = ownedIds.length
        ? (await Promise.all(ownedIds.map((id) => kv.get<KVWishlist>(`wishlist:${id}`)))).filter(Boolean) as KVWishlist[]
        : []

    const wishCounts = ownedWishlists.length
        ? await Promise.all(ownedWishlists.map((w) => kv.scard(`wishlist:${w.id}:wishes`)))
        : []
    const totalWishes = wishCounts.reduce((sum, count) => sum + count, 0)

    return NextResponse.json({
        wishlists: ownedWishlists.length,
        wishes: totalWishes,
        shared: sharedIds.length,
    })
}
