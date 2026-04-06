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

import {CreateWishlistModal} from '@/features/CreateWishlist';
import {TWishlistFormData} from '@/entities/wishlist';
import {UpdateWishlistModal} from '@/features/UpdateWishlist';

import pageStyles from './page.module.css'

const toast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') =>
  eventBus.emit('ui:toast', { message, type })

export default function WishlistsPage() {
  const user = mockUserPrivate
  const [wishlists, setWishlists] = useState<TWishlistCard[]>(wishlistCardListMock)
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)
  const [updatingWishlistId, setUpdatingWishlistId] = useState<string | null>(null)

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

  const handleCreateWishlist = (wishlistData: TWishlistFormData & { id: string; isPending?: boolean }) => {
    const isPending = wishlistData.isPending ?? false

    if (isPending) {
      const newWishlist: TWishlistCard = {
        id: wishlistData.id,
        name: wishlistData.name,
        description: wishlistData.description,
        coverImage: wishlistData.coverImage,
        isPublic: wishlistData.isPublic,
        ownerId: user.id,
        ownerName: user.name ?? user.email ?? 'Unknown',
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
            wishlist.ownerId === user.id &&
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
      toast(`"${wishlistData.name}" created`, 'success')
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
            }
          : wishlist
      )
    )
    setUpdatingWishlistId(null)
    toast(`"${wishlistData.name}" updated`, 'success')
  }

  const displayName = user.name?.split(' ')[0] ?? 'there'
  const totalWishlists = wishlists.length
  const ownedCount = ownedWishlists.length
  const sharedCount = allInvitedWishlists.length

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
            onError={(tempId) => {
              setWishlists((prev) => prev.filter((w) => w.id !== tempId))
              toast('Could not create wishlist — please try again', 'error')
            }}
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
    <main>
      <div className={pageStyles.pageHero}>
        <div className={pageStyles.pageHero__inner}>
          <p className={pageStyles.pageHero__greeting}>Hello, {displayName}</p>
          <h1 className={pageStyles.pageHero__title}>Your Wishlists</h1>
          <div className={pageStyles.pageHero__stats}>
            <span className={pageStyles.pageHero__stat}>
              <strong>{totalWishlists}</strong> total
            </span>
            <span className={pageStyles.pageHero__statDivider}>·</span>
            <span className={pageStyles.pageHero__stat}>
              <strong>{ownedCount}</strong> yours
            </span>
            <span className={pageStyles.pageHero__statDivider}>·</span>
            <span className={pageStyles.pageHero__stat}>
              <strong>{sharedCount}</strong> shared with you
            </span>
          </div>
          <button
            className={pageStyles.pageHero__cta}
            onClick={() => eventBus.emit('wishlist:openCreationModal', {})}
          >
            New Wishlist
          </button>
        </div>
      </div>

      <div className={pageStyles.pageContent}>
        <Tabs tabs={tabs}/>
      </div>
    </main>
  )
}
