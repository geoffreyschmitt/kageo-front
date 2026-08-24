import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type KVUser = {
    id: string
    email: string
    name: string
    provider: string
    createdAt: string
    isPublic?: boolean
}

type KVWishlist = Record<string, unknown> & { id: string; ownerId: string }

// GET /api/user/export — a JSON dump of everything this account owns
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const email = await kv.get<string>(`user:id:${userId}`)
    if (!email) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const user = await kv.get<KVUser>(`user:${email}`)
    const wishlistIds = (await kv.smembers<string[]>(`user:${userId}:wishlists`)) ?? []

    const wishlists = wishlistIds.length
        ? (await Promise.all(wishlistIds.map((id) => kv.get<KVWishlist>(`wishlist:${id}`)))).filter(Boolean) as KVWishlist[]
        : []

    const ownedWishlists = wishlists.filter((w) => w.ownerId === userId)

    const wishlistsWithWishes = await Promise.all(
        ownedWishlists.map(async (wishlist) => {
            const wishIds = (await kv.smembers<string[]>(`wishlist:${wishlist.id}:wishes`)) ?? []
            const wishes = wishIds.length
                ? (await Promise.all(wishIds.map((id) => kv.get(`wish:${id}`)))).filter(Boolean)
                : []
            return { ...wishlist, wishes }
        }),
    )

    return NextResponse.json({
        exportedAt: new Date().toISOString(),
        profile: user
            ? { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
            : null,
        wishlists: wishlistsWithWishes,
    })
}
