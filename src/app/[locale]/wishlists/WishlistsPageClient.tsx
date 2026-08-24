'use client'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { WishlistList } from '@/widgets'
import { TWishlistCard } from '@/widgets/WishlistCard'
import { OwnerFilter } from '@/features/FilterWishlistOwner'
import { TWishlistOwner } from '@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types'
import { Tabs } from '@/shared/ui'
import { eventBus } from '@/shared/eventBus'
import { Link } from '@/shared/i18n/navigation'
import { CreateWishlistModal } from '@/features/CreateWishlist'
import { TWishlistFormData } from '@/entities/wishlist'
import { UpdateWishlistModal } from '@/features/UpdateWishlist'
import { isEventPast } from '@/shared/lib/isEventPast'

import pageStyles from './page.module.css'

type Props = {
    initialWishlists: TWishlistCard[]
    userId: string
    userName: string
}

const toast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') =>
    eventBus.emit('ui:toast', { message, type })

export default function WishlistsPageClient({ initialWishlists, userId, userName }: Props) {
    const t = useTranslations('wishlists')
    const [wishlists, setWishlists] = useState<TWishlistCard[]>(initialWishlists)
    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)
    const [updatingWishlistId, setUpdatingWishlistId] = useState<string | null>(null)

    useEffect(() => {
        const removeOpenModalEvent = eventBus.on('wishlist:openUpdateModal', (payload: { id?: string }) => {
            if (payload.id) setUpdatingWishlistId(payload.id)
        })
        return () => { removeOpenModalEvent() }
    }, [])

    const sortByEventDate = (a: TWishlistCard, b: TWishlistCard) =>
        a.eventDate.getTime() - b.eventDate.getTime()

    const activeWishlists = useMemo(() =>
        wishlists.filter((w) => !isEventPast(w.eventDate)),
        [wishlists]
    )

    const ownedWishlists = useMemo(() =>
        activeWishlists.filter((w) => w.ownerId === userId).sort(sortByEventDate),
        [activeWishlists, userId]
    )

    const allInvitedWishlists = useMemo(() =>
        activeWishlists.filter((w) => w.ownerId !== userId).sort(sortByEventDate),
        [activeWishlists, userId]
    )

    const uniqueInvitedOwners = useMemo(() => {
        const ownersMap = new Map<string, { id: string; name: string }>()
        allInvitedWishlists.forEach((wishlist) => {
            if (!ownersMap.has(wishlist.ownerId)) {
                ownersMap.set(wishlist.ownerId, { id: wishlist.ownerId, name: wishlist.ownerName })
            }
        })
        return Array.from(ownersMap.values()).sort()
    }, [allInvitedWishlists])

    const filteredInvitedWishlists = useMemo(() => {
        if (!selectedOwnerFilter) return allInvitedWishlists
        return allInvitedWishlists.filter((w) => w.ownerId === selectedOwnerFilter.id)
    }, [allInvitedWishlists, selectedOwnerFilter])

    const handleCreateWishlist = (wishlistData: TWishlistFormData & { id: string; isPending?: boolean }) => {
        const isPending = wishlistData.isPending ?? false
        if (isPending) {
            const newWishlist: TWishlistCard = {
                id: wishlistData.id,
                name: wishlistData.name,
                description: wishlistData.description,
                coverImage: wishlistData.coverImage,
                isPublic: wishlistData.isPublic,
                ownerId: userId,
                ownerName: userName,
                eventDate: wishlistData.eventDate ? new Date(wishlistData.eventDate) : new Date(),
                createdAt: new Date(),
                itemCount: 0,
                isPending: true,
            }
            setWishlists((prev) => [newWishlist, ...prev])
        } else {
            setWishlists((prev) =>
                prev.map((wishlist) => {
                    if (
                        wishlist.isPending &&
                        wishlist.ownerId === userId &&
                        wishlist.name === wishlistData.name &&
                        wishlist.description === wishlistData.description &&
                        wishlist.isPublic === wishlistData.isPublic &&
                        wishlist.coverImage === wishlistData.coverImage
                    ) {
                        return { ...wishlist, id: wishlistData.id, isPending: false }
                    }
                    return wishlist
                })
            )
            toast(t('created', { name: wishlistData.name }), 'success')
        }
    }

    const handleUpdateWishlist = (wishlistData: TWishlistFormData & { id: string }) => {
        setWishlists((prev) =>
            prev.map((wishlist) =>
                wishlist.id === wishlistData.id
                    ? {
                          ...wishlist,
                          name: wishlistData.name,
                          description: wishlistData.description,
                          coverImage: wishlistData.coverImage,
                          isPublic: wishlistData.isPublic,
                          eventDate: wishlistData.eventDate ? new Date(wishlistData.eventDate) : wishlist.eventDate,
                      }
                    : wishlist
            )
        )
        setUpdatingWishlistId(null)
        toast(t('updated', { name: wishlistData.name }), 'success')
    }

    const displayName = userName.split(' ')[0] ?? 'there'
    const totalWishlists = activeWishlists.length
    const ownedCount = ownedWishlists.length
    const sharedCount = allInvitedWishlists.length

    const tabs = [
        {
            label: t('tabMine'),
            content: (
                <WishlistList
                    wishlistCardList={ownedWishlists}
                    currentUserId={userId}
                    title={t('listTitleMine')}
                    emptyMessage={t('emptyMine')}
                    showCreateButton={true}
                />
            ),
        },
        {
            label: t('tabShared'),
            content: (
                <>
                    <div className={pageStyles.filterContainer}>
                        <OwnerFilter
                            owners={uniqueInvitedOwners}
                            selectedOwner={selectedOwnerFilter?.name}
                            onSelectOwner={setSelectedOwnerFilter}
                        />
                    </div>
                    <WishlistList
                        wishlistCardList={filteredInvitedWishlists}
                        currentUserId={userId}
                        title={t('listTitleShared')}
                        emptyMessage={t('emptyShared')}
                        showCreateButton={false}
                    />
                </>
            ),
        },
    ]

    return (
        <main>
            <div className={pageStyles.pageHero}>
                <div className={pageStyles.pageHero__inner}>
                    <p className={pageStyles.pageHero__greeting}>{t('greeting', { name: displayName })}</p>
                    <h1 className={pageStyles.pageHero__title}>{t('title')}</h1>
                    <div className={pageStyles.pageHero__stats}>
                        <span className={pageStyles.pageHero__stat}>
                            <strong>{totalWishlists}</strong> {t('statTotal')}
                        </span>
                        <span className={pageStyles.pageHero__statDivider}>·</span>
                        <span className={pageStyles.pageHero__stat}>
                            <strong>{ownedCount}</strong> {t('statYours')}
                        </span>
                        <span className={pageStyles.pageHero__statDivider}>·</span>
                        <span className={pageStyles.pageHero__stat}>
                            <strong>{sharedCount}</strong> {t('statShared')}
                        </span>
                    </div>
                    <div className={pageStyles.pageHero__actions}>
                        <button
                            className={pageStyles.pageHero__cta}
                            onClick={() => eventBus.emit('wishlist:openCreationModal', {})}
                        >
                            {t('newWishlist')}
                        </button>
                        <Link href="/history" className={pageStyles.pageHero__historyLink}>
                            <span className={pageStyles.pageHero__historyIcon}>↩</span>
                            {t('viewPast')}
                        </Link>
                    </div>
                </div>
            </div>

            <div className={pageStyles.pageContent}>
                <Tabs tabs={tabs} />
            </div>

            <CreateWishlistModal
                onSubmit={handleCreateWishlist}
                onError={(tempId) => {
                    setWishlists((prev) => prev.filter((w) => w.id !== tempId))
                    toast(t('createError'), 'error')
                }}
            />
            <UpdateWishlistModal onSubmit={handleUpdateWishlist} />
        </main>
    )
}
