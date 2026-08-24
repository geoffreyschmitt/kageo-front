import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { TWishlistCard } from '@/widgets/WishlistCard'
import { isEventPast } from '@/shared/lib/isEventPast'
import { getUserNamesByIds } from '@/shared/lib/getUserNameById'
import HistoryPageClient from './HistoryPageClient'

type KVWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    eventDate: string
    createdAt: string
}

export default async function HistoryPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/')

    const userId = session.user.id
    const userName = session.user.name ?? session.user.email ?? 'there'

    const ownedIds = (await kv.smembers<string[]>(`user:${userId}:wishlists`)) ?? []
    const sharedIds = session.user.email
        ? (await kv.smembers<string[]>(`email:${session.user.email.toLowerCase()}:invitedWishlists`)) ?? []
        : []
    const wishlistIds = Array.from(new Set([...ownedIds, ...sharedIds]))

    const rawWishlists = wishlistIds.length
        ? (await Promise.all(wishlistIds.map((id) => kv.get<KVWishlist>(`wishlist:${id}`)))).filter(Boolean) as KVWishlist[]
        : []

    const pastWishlists = rawWishlists.filter((w) => isEventPast(new Date(w.eventDate)))

    const itemCounts = pastWishlists.length
        ? await Promise.all(pastWishlists.map((w) => kv.scard(`wishlist:${w.id}:wishes`)))
        : []

    const ownerNames = await getUserNamesByIds(pastWishlists.map((w) => w.ownerId))

    const wishlists: TWishlistCard[] = pastWishlists.map((w, i) => ({
        id: w.id,
        ownerId: w.ownerId,
        ownerName: w.ownerId === userId ? userName : ownerNames.get(w.ownerId) ?? 'Unknown',
        name: w.name,
        description: w.description,
        coverImage: w.coverImage,
        isPublic: w.isPublic,
        eventDate: new Date(w.eventDate),
        createdAt: new Date(w.createdAt),
        itemCount: itemCounts[i] ?? 0,
        isHistory: true,
    }))

    return (
        <HistoryPageClient
            initialWishlists={wishlists}
            userId={userId}
            userName={userName}
        />
    )
}
