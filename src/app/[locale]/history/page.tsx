'use client';
import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';

import {WishlistList} from '@/widgets'
import {TWishlistCard} from '@/widgets/WishlistCard';

import {wishlistCardListMock} from '@/widgets/WishlistList/lib';

import {OwnerFilter} from '@/features/FilterWishlistOwner';
import {TWishlistOwner} from '@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types';

import {mockUserPrivate} from '@/entities/user';

import {Tabs} from '@/shared/ui'
import {isEventPast} from '@/shared/lib/isEventPast';

import pageStyles from './page.module.css'

export default function HistoryPage() {
  const t = useTranslations('history')
  const user = mockUserPrivate
  const [wishlists] = useState<TWishlistCard[]>(
    wishlistCardListMock.filter((w) => isEventPast(w.eventDate))
  )
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)

  const sortByEventDate = (a: TWishlistCard, b: TWishlistCard) =>
    b.eventDate.getTime() - a.eventDate.getTime()

  const ownedWishlists = useMemo(() =>
    wishlists.filter((w) => w.ownerId === user.id).sort(sortByEventDate),
    [wishlists, user.id]
  )
  const allInvitedWishlists = useMemo(() =>
    wishlists.filter((w) => w.ownerId !== user.id).sort(sortByEventDate),
    [wishlists, user.id]
  )

  const uniqueInvitedOwners = useMemo(() => {
    const ownersMap = new Map<string, { id: string, name: string }>();
    allInvitedWishlists.forEach((wishlist) => {
      if (!ownersMap.has(wishlist.ownerId)) {
        ownersMap.set(wishlist.ownerId, {id: wishlist.ownerId, name: wishlist.ownerName});
      }
    });
    return Array.from(ownersMap.values()).sort();
  }, [allInvitedWishlists])

  const filteredInvitedWishlists = useMemo(() => {
    if (!selectedOwnerFilter) {
      return allInvitedWishlists
    }
    return allInvitedWishlists.filter((wishlist) => wishlist.ownerId === selectedOwnerFilter.id)
  }, [allInvitedWishlists, selectedOwnerFilter])

  const displayName = user.name?.split(' ')[0] ?? 'there'
  const totalPast = wishlists.length
  const ownedCount = ownedWishlists.length
  const sharedCount = allInvitedWishlists.length

  const tabs = [
    {
      label: t('tabMine'),
      content: (
        <WishlistList
          wishlistCardList={ownedWishlists}
          title={t('listTitleMine')}
          emptyMessage={t('emptyMine')}
          showCreateButton={false}
          isHistory={true}
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
            title={t('listTitleShared')}
            emptyMessage={t('emptyShared')}
            showCreateButton={false}
            isHistory={true}
          />
        </>
      ),
    },
  ]

  return (
    <main>
      <div className={pageStyles.pageHero}>
        <div className={pageStyles.pageHero__inner}>
          <p className={pageStyles.pageHero__greeting}>{t('greeting', {name: displayName})}</p>
          <h1 className={pageStyles.pageHero__title}>{t('title')}</h1>
          <div className={pageStyles.pageHero__stats}>
            <span className={pageStyles.pageHero__stat}>
              {t('statPast', {count: totalPast})}
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
          <p className={pageStyles.pageHero__subtitle}>{t('subtitle')}</p>
        </div>
      </div>

      <div className={pageStyles.pageContent}>
        <Tabs tabs={tabs}/>
      </div>
    </main>
  )
}
