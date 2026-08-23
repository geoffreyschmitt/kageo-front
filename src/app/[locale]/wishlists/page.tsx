import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { TWishlistCard } from '@/widgets/WishlistCard'
import WishlistsPageClient from './WishlistsPageClient'

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

export default async function WishlistsPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/')

    const userId = session.user.id
    const userName = session.user.name ?? session.user.email ?? 'there'

    const wishlistIds = await kv.smembers<string[]>(`user:${userId}:wishlists`)

    const rawWishlists = wishlistIds?.length
        ? (await Promise.all(wishlistIds.map((id) => kv.get<KVWishlist>(`wishlist:${id}`)))).filter(Boolean) as KVWishlist[]
        : []

    const itemCounts = rawWishlists.length
        ? await Promise.all(rawWishlists.map((w) => kv.scard(`wishlist:${w.id}:wishes`)))
        : []

    const wishlists: TWishlistCard[] = rawWishlists.map((w, i) => ({
        id: w.id,
        ownerId: w.ownerId,
        ownerName: userName,
        name: w.name,
        description: w.description,
        coverImage: w.coverImage,
        isPublic: w.isPublic,
        eventDate: new Date(w.eventDate),
        createdAt: new Date(w.createdAt),
        itemCount: itemCounts[i] ?? 0,
    }))

    return (
        <WishlistsPageClient
            initialWishlists={wishlists}
            userId={userId}
            userName={userName}
        />
    )
}
