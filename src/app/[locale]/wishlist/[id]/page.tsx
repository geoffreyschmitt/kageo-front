import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { TWishCard } from '@/widgets/WishCard/WishCard.types'
import { readPotForViewer } from '@/app/api/wishlist/pot/readPot'
import WishlistPageClient from './WishlistPageClient'

type KVWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    allowSuggestions?: boolean
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
    showToOwner?: boolean
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
    const isLoggedIn = !!session?.user?.id

    const isInvited =
        !userIsOwner && isLoggedIn && session?.user?.email
            ? Boolean(await kv.sismember(`wishlist:${id}:invitees`, session.user.email.toLowerCase()))
            : false

    if (!wishlist.isPublic && !userIsOwner && !isInvited) redirect('/')

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
        showToOwner: w.showToOwner ?? false,
    }))

    // Look up ownerName: use session name if owner, else look up via KV reverse index
    let ownerName = 'Unknown'
    let ownerHasPublicProfile = false
    if (userIsOwner && session?.user?.name) {
        ownerName = session.user.name
    } else {
        const ownerEmail = await kv.get<string>(`user:id:${wishlist.ownerId}`)
        if (ownerEmail) {
            const ownerUser = await kv.get<{ name: string; isPublic?: boolean }>(`user:${ownerEmail}`)
            if (ownerUser?.name) ownerName = ownerUser.name
            ownerHasPublicProfile = !!ownerUser?.isPublic
        }
    }

    // Pot is a surprise — only fetch/expose it to non-owners. readPotForViewer
    // returns null for the owner and when no pot exists.
    const potView = userIsOwner
        ? null
        : await readPotForViewer({ wishlistId: id, userId: session?.user?.id ?? null })
    const potExists = userIsOwner
        ? Boolean(await kv.get(`wishlist:${id}:pot`))
        : potView !== null
    const initialPot = {
        creatorName: potView?.creatorName ?? null,
        totalContributed: potView?.totalContributed ?? 0,
        userContributed: potView?.myContribution ?? 0,
    }

    // A wishlist can only be edited/deleted once it's in history if nothing
    // has happened on it yet — no reserved/purchased/proposed wishes, no
    // pot, no comments from invitees.
    const commentsCount = (await kv.lrange<string>(`wishlist:${id}:comments`, 0, -1))?.length ?? 0
    const hasActivity =
        rawWishes.some((w) => w.status !== 'wanted') || potExists || commentsCount > 0

    return (
        <WishlistPageClient
            id={wishlist.id}
            name={wishlist.name}
            description={wishlist.description}
            isPublic={wishlist.isPublic}
            eventDate={wishlist.eventDate}
            coverImage={wishlist.coverImage ?? ''}
            allowSuggestions={wishlist.allowSuggestions ?? true}
            ownerId={wishlist.ownerId}
            ownerName={ownerName}
            ownerProfileUrl={!userIsOwner && ownerHasPublicProfile ? `/u/${wishlist.ownerId}` : null}
            currency={wishlist.currency ?? '€'}
            userIsOwner={userIsOwner}
            isHistory={isHistory}
            hasActivity={hasActivity}
            userId={session?.user?.id ?? ''}
            isLoggedIn={isLoggedIn}
            isInvited={isInvited}
            initialItems={items}
            initialPot={initialPot}
        />
    )
}
