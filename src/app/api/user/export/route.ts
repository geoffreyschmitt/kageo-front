import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { maskWishForOwner } from '@/shared/lib/maskWishForOwner'
import { limitWrite } from '@/shared/lib/rateLimit'
import { getSafeBets } from '@/shared/lib/safeBets'

import { exportActivity } from './exportActivity'

type KVUser = {
    id: string
    email: string
    name: string
    provider: string
    createdAt: string
    isPublic?: boolean
    birthdate?: string
}

type KVWishlist = Record<string, unknown> & { id: string; ownerId: string }

// GET /api/user/export — a JSON dump of everything this account owns
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const limited = await limitWrite(request, session.user.id, 'write')
    if (limited) return limited

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
            // Same masking as the wishlist page: an export must not reveal reservations to the owner.
            return { ...wishlist, wishes: wishes.map(maskWishForOwner) }
        }),
    )

    const safeBets = await getSafeBets(userId)
    const activity = await exportActivity(userId, {
        wishlists: new Set(ownedWishlists.map((w) => w.id)),
        wishes: new Set(wishlistsWithWishes.flatMap((w) => w.wishes.map((wish) => String(wish.id)))),
        safeBets: new Set(safeBets.map((bet) => bet.id)),
    })

    return NextResponse.json({
        exportedAt: new Date().toISOString(),
        profile: user
            ? { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt, birthdate: user.birthdate ?? null }
            : null,
        wishlists: wishlistsWithWishes,
        safeBets,
        activity,
    })
}
