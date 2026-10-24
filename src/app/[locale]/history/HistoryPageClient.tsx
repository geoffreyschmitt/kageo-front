'use client'
import { useMemo, useState } from 'react'

import { useTranslations } from 'next-intl'

import { WishlistList } from '@/widgets'

import { TWishlistCard } from '@/widgets/WishlistCard'

import { OwnerFilter } from '@/features/FilterWishlistOwner'
import { TWishlistOwner } from '@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types'

import { Tabs } from '@/shared/ui'

import pageStyles from './page.module.css'

type Props = {
    initialWishlists: TWishlistCard[]
    userId: string
    userName: string
}

export default function HistoryPageClient({ initialWishlists, userId }: Props) {
    const t = useTranslations('history')
    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)

    const sortByEventDate = (a: TWishlistCard, b: TWishlistCard) =>
        b.eventDate.getTime() - a.eventDate.getTime()

    const ownedWishlists = useMemo(() =>
        initialWishlists.filter((w) => w.ownerId === userId).sort(sortByEventDate),
        [initialWishlists, userId]
    )

    const allInvitedWishlists = useMemo(() =>
        initialWishlists.filter((w) => w.ownerId !== userId).sort(sortByEventDate),
        [initialWishlists, userId]
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

    const tabs = [
        {
            id: 'mine',
            label: t('tabMine'),
            count: ownedWishlists.length,
            content: (
                <WishlistList
                    wishlistCardList={ownedWishlists}
                    currentUserId={userId}
                    emptyMessage={t('emptyMine')}
                    showCreateButton={false}
                    isHistory={true}
                    hideHeader
                />
            ),
        },
        {
            id: 'shared',
            label: t('tabShared'),
            count: allInvitedWishlists.length,
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
                        emptyMessage={t('emptyShared')}
                        showCreateButton={false}
                        isHistory={true}
                        hideHeader
                    />
                </>
            ),
        },
    ]

    return (
        <main>
            <div className={pageStyles.pageContent}>
                <header className={pageStyles.pageHeader}>
                    <h1 className={pageStyles.pageHeader__title}>{t('title')}</h1>
                    <p className={pageStyles.pageHeader__subtitle}>{t('subtitle')}</p>
                </header>
                <Tabs tabs={tabs} />
            </div>
        </main>
    )
}
