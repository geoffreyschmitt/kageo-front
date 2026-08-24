import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'
import { getTranslations } from 'next-intl/server'

import { authOptions } from '@/shared/config/authOptions'
import { TWishlistCard } from '@/widgets/WishlistCard'
import PublicProfilePage from '@/views/publicProfile/ui/PublicProfilePage'

type KVUser = {
    id: string
    name: string
    createdAt: string
    isPublic?: boolean
}

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const t = await getTranslations('metadata')
    const { id } = await params
    const email = await kv.get<string>(`user:id:${id}`)
    const user = email ? await kv.get<KVUser>(`user:${email}`) : null

    if (!user?.isPublic) {
        return { title: t('profileTitle') }
    }

    return { title: `${user.name} — Kageo` }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const email = await kv.get<string>(`user:id:${id}`)
    if (!email) notFound()

    const user = await kv.get<KVUser>(`user:${email}`)
    if (!user || !user.isPublic) notFound()

    const session = await getServerSession(authOptions)

    const wishlistIds = (await kv.smembers<string[]>(`user:${id}:wishlists`)) ?? []
    const rawWishlists = wishlistIds.length
        ? (await Promise.all(wishlistIds.map((wid) => kv.get<KVWishlist>(`wishlist:${wid}`)))).filter(Boolean) as KVWishlist[]
        : []

    const publicWishlists = rawWishlists.filter((w) => w.ownerId === id && w.isPublic)

    const itemCounts = publicWishlists.length
        ? await Promise.all(publicWishlists.map((w) => kv.scard(`wishlist:${w.id}:wishes`)))
        : []

    const wishlists: TWishlistCard[] = publicWishlists.map((w, i) => ({
        id: w.id,
        ownerId: w.ownerId,
        ownerName: user.name,
        name: w.name,
        description: w.description,
        coverImage: w.coverImage,
        isPublic: w.isPublic,
        eventDate: new Date(w.eventDate),
        createdAt: new Date(w.createdAt),
        itemCount: itemCounts[i] ?? 0,
    }))

    return (
        <PublicProfilePage
            name={user.name}
            createdAt={user.createdAt}
            wishlists={wishlists}
            currentUserId={session?.user?.id ?? ''}
        />
    )
}
