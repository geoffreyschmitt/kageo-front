import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { getUserNamesByIds } from '@/shared/lib/getUserNameById'
import { TWishCard } from '@/widgets/WishCard/WishCard.types'
import { readPotForViewer } from '@/app/api/wishlist/pot/readPot'
import { readGiftPotForViewer } from '@/app/api/wish/pot/readGiftPot'
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
    status: 'wanted' | 'purchased' | 'reserved' | 'proposed' | 'funded'
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

    const giftPotViews = userIsOwner
        ? new Map<string, null>()
        : new Map(
              await Promise.all(
                  rawWishes.map(async (w) => [
                      w.id,
                      await readGiftPotForViewer({ wishId: w.id, userId: session?.user?.id ?? null }),
                  ] as const),
              ),
          )

    // Comment counts feed the per-card counter. Never computed for the owner —
    // comments are never exposed to them, so the counter stays hidden too.
    const commentCounts: Record<string, number> = {}
    if (!userIsOwner && rawWishes.length) {
        const counts = await Promise.all(
            rawWishes.map((w) => kv.llen(`wish:${w.id}:comments`)),
        )
        rawWishes.forEach((w, i) => {
            commentCounts[w.id] = counts[i] ?? 0
        })
    }

    // Resolve reserver / purchaser ids to display names so cards never show a raw uuid.
    const actorNames = await getUserNamesByIds(
        rawWishes.flatMap((w) => [w.reservedBy, w.purchasedBy].filter((v): v is string => !!v)),
    )

    const items: TWishCard[] = rawWishes.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        price: w.price,
        currency: w.currency,
        imageUrl: w.imageUrl,
        priority: w.priority,
        status: userIsOwner && w.status === 'funded' ? 'wanted' : w.status,
        purchaseUrl: w.purchaseUrl,
        notes: w.notes,
        addedDate: new Date(w.createdAt).toLocaleDateString(),
        commentCount: userIsOwner ? undefined : (commentCounts[w.id] ?? 0),
        reservedBy: w.reservedBy,
        purchasedBy: w.purchasedBy,
        reservedByName: w.reservedBy ? actorNames.get(w.reservedBy) : undefined,
        purchasedByName: w.purchasedBy ? actorNames.get(w.purchasedBy) : undefined,
        isProposed: w.status === 'proposed',
        showToOwner: w.showToOwner ?? false,
        giftPot: userIsOwner ? undefined : (giftPotViews.get(w.id) ?? null),
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

    // A wishlist can only be edited/deleted once it's in history if nothing
    // has happened on it yet — no reserved/purchased/proposed wishes, no
    // pot, no comments from invitees.
    const commentsCount = (await kv.lrange<string>(`wishlist:${id}:comments`, 0, -1))?.length ?? 0
    const anyGiftPot = userIsOwner
        ? (await Promise.all(rawWishes.map((w) => kv.get(`wish:${w.id}:pot`)))).some(Boolean)
        : Array.from(giftPotViews.values()).some((v) => v !== null)

    const hasActivity =
        rawWishes.some((w) => w.status !== 'wanted') || potExists || anyGiftPot || commentsCount > 0

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
            initialPot={potView}
        />
    )
}
