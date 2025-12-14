'use client';
import {useEffect, useMemo, useState} from 'react';

import {WishlistList} from '@/widgets'
import {TWishlistCard} from '@/widgets/WishlistCard';

import {wishlistCardListMock} from '@/widgets/WishlistList/lib';

import {OwnerFilter} from '@/features/FilterWishlistOwner';
import {TWishlistOwner} from '@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types';

import {mockUserPrivate} from '@/entities/user';

import {Tabs} from '@/shared/ui'
import {eventBus} from '@/shared/eventBus';

import pageStyles from './page.module.css'
import {CreateWishlistModal} from '@/features/CreateWishlist';
import {TWishlistFormData} from '@/entities/wishlist';
import {UpdateWishlistModal} from '@/features/UpdateWishlist';

export default function WishlistsPage() {
  const user = mockUserPrivate
  // Convert static mock data to state
  const [wishlists, setWishlists] = useState<TWishlistCard[]>(wishlistCardListMock)
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)
  
  // Track which wishlist is being updated (from event bus)
  const [updatingWishlistId, setUpdatingWishlistId] = useState<string | null>(null)

  // Listen to update modal open event to track the wishlist being updated
  useEffect(() => {
    const removeOpenModalEvent = eventBus.on('wishlist:openUpdateModal', (payload: { id?: string }) => {
      if (payload.id) {
        setUpdatingWishlistId(payload.id)
      }
    })
    return () => {
      removeOpenModalEvent()
    }
  }, [])

  // Compute owned and invited wishlists from state
  const ownedWishlists = useMemo(() => 
    wishlists.filter((w) => w.ownerId === user.id),
    [wishlists, user.id]
  )
  const allInvitedWishlists = useMemo(() => 
    wishlists.filter((w) => w.ownerId !== user.id),
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

  const handleCreateWishlist = (wishlistData: TWishlistFormData & { id: string }) => {
    // Convert form data to TWishlistCard format
    const newWishlist: TWishlistCard = {
      id: wishlistData.id,
      name: wishlistData.name,
      description: wishlistData.description,
      coverImage: wishlistData.coverImage,
      isPublic: wishlistData.isPublic,
      ownerId: user.id,
      ownerName: user.name,
      createdAt: new Date(),
      itemCount: 0,
    }
    
    // Add new wishlist to state (optimistic update)
    setWishlists((prev) => [newWishlist, ...prev])
  }

  const handleUpdateWishlist = (wishlistData: TWishlistFormData & { id: string }) => {
    // Find and update the wishlist in state (optimistic update)
    setWishlists((prev) =>
      prev.map((wishlist) =>
        wishlist.id === wishlistData.id
          ? {
              ...wishlist,
              name: wishlistData.name,
              description: wishlistData.description,
              coverImage: wishlistData.coverImage,
              isPublic: wishlistData.isPublic,
            }
          : wishlist
      )
    )
    setUpdatingWishlistId(null)
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
            onSubmit={handleUpdateWishlist}
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
