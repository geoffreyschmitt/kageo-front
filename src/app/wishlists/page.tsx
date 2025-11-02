'use client';
import {useMemo, useState} from 'react';

import {WishlistList} from '@/widgets'

import {wishlistCardListMock} from '@/widgets/WishlistList/lib';

import {OwnerFilter} from '@/features/FilterWishlistOwner';
import {TWishlistOwner} from '@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types';

import {mockUserPrivate} from '@/entities/user';

import {Tabs} from '@/shared/ui'

import pageStyles from './page.module.css'
import {CreateWishlistModal} from '@/features/CreateWishlist';
import {TWishlistFormData} from '@/entities/wishlist';
import {UpdateWishlistModal} from '@/features/UpdateWishlist';

export default function WishlistsPage() {
  const user = mockUserPrivate
  const ownedWishlists = wishlistCardListMock.filter((w) => w.ownerId === user.id)
  const allInvitedWishlists = wishlistCardListMock.filter((w) => w.ownerId !== user.id)

  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)


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

  const handleCreateWishlist = (wishlist: TWishlistFormData) => {
    console.log('Wishlist created:', wishlist)
  }

  // Define the tabs for the Tabs component
  const tabs = [
    {
      label: 'My Wishlists',
      content: (
        <>
          <WishlistList
            wishlistCardList={ownedWishlists}
            title="My Wishlists"
            emptyMessage="You haven't created any wishlists yet. Start by creating one!"
            showCreateButton={true}
          />
          <CreateWishlistModal
            onSubmit={handleCreateWishlist}
          />
          <UpdateWishlistModal
            onSubmit={handleCreateWishlist}
          />
        </>
      ),
    },
    {
      label: 'Shared with Me',
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
            title="Wishlists Shared with Me"
            emptyMessage="No wishlists have been shared with you yet."
            showCreateButton={false}
          />
        </>
      ),
    },
  ]

  return (
    <main className={pageStyles.pageLayout}>
      <Tabs tabs={tabs}/>
    </main>
  )
}
