import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { TWishCard } from '@/widgets/WishCard/WishCard.types'
import WishlistPageClient from './WishlistPageClient'

type KVWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    eventDate: string
    createdAt: string
    currency?: string
    totalContributed?: number
}

type KVWish = {
    id: string
    wishlistId: string
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: 'low' | 'medium' | 'high'
    status: 'wanted' | 'purchased' | 'reserved' | 'proposed'
    purchaseUrl?: string
    notes?: string
    createdAt: string
    reservedBy?: string
    purchasedBy?: string
    proposedBy?: string
}

export default async function WishlistPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ mode?: string }>
}) {
    const { id } = await params
    const { mode } = await searchParams
    const isHistory = mode === 'history'

    const session = await getServerSession(authOptions)

    const wishlist = await kv.get<KVWishlist>(`wishlist:${id}`)
    if (!wishlist) notFound()

    const userIsOwner = session?.user?.id === wishlist.ownerId

    if (!wishlist.isPublic && !userIsOwner) redirect('/')

    const wishIds = await kv.smembers<string[]>(`wishlist:${id}:wishes`)
    const rawWishes = wishIds?.length
        ? (await Promise.all(wishIds.map((wid) => kv.get<KVWish>(`wish:${wid}`)))).filter(Boolean) as KVWish[]
        : []

    const items: TWishCard[] = rawWishes.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        price: w.price,
        currency: w.currency,
        imageUrl: w.imageUrl,
        priority: w.priority,
        status: w.status,
        purchaseUrl: w.purchaseUrl,
        notes: w.notes,
        addedDate: new Date(w.createdAt).toLocaleDateString(),
        reservedBy: w.reservedBy,
        purchasedBy: w.purchasedBy,
        isProposed: w.status === 'proposed',
    }))

    // Look up ownerName: use session name if owner, else look up via KV reverse index
    let ownerName = 'Unknown'
    if (userIsOwner && session?.user?.name) {
        ownerName = session.user.name
    } else {
        const ownerEmail = await kv.get<string>(`user:id:${wishlist.ownerId}`)
        if (ownerEmail) {
            const ownerUser = await kv.get<{ name: string }>(`user:${ownerEmail}`)
            if (ownerUser?.name) ownerName = ownerUser.name
        }
    }

    return (
        <WishlistPageClient
            id={wishlist.id}
            name={wishlist.name}
            description={wishlist.description}
            isPublic={wishlist.isPublic}
            eventDate={wishlist.eventDate}
            ownerId={wishlist.ownerId}
            ownerName={ownerName}
            currency={wishlist.currency ?? '$'}
            userIsOwner={userIsOwner}
            isHistory={isHistory}
            userId={session?.user?.id ?? ''}
            initialItems={items}
            initialTotalContributed={wishlist.totalContributed ?? 0}
            initialUserContributed={0}
        />
    )
}
