'use client'

import {useMemo, useState} from 'react'

import {AddWishModal} from '@/features/AddWish'
import {ProposeWishModal} from '@/features/ProposeWish';
import {ShareWishlistModal} from '@/features/ShareWishlist'
import {UpdateWishlistModal} from '@/features/UpdateWishlist'

import {TProposedWishFormData, TWish, TWishFormData, Wish} from '@/entities/wish'
import {TWishlistFormData} from '@/entities/wishlist';

import styles from './wishlist.module.css'
import {eventBus} from '@/shared/eventBus/';
import {mockUserPrivate} from '@/entities/user';


type TWishlistPageProps = {
  id: string
  name: string
  description: string
  items: TWish[]
  isPublic: boolean
  createdDate: string
  ownerId: string
  ownerName: string
  onAddItem?: () => void
  onShareWishlist?: () => void
  onEditWishlist?: () => void
  userIsOwner: boolean
}

export default function Wishlist({
  id,
  name,
  description,
  items = [],
  isPublic,
  createdDate,
  ownerId,
  ownerName,
  onAddItem,
  userIsOwner = false,
}: TWishlistPageProps) {
  const user = mockUserPrivate

  const [sortBy, setSortBy] = useState<'name' | 'price' | 'date'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<('all' | 'wanted' | 'purchased' | 'reserved' | 'proposed')[]>(['all'])
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({min: 0, max: 1000})
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isProposeItemModalOpen, setIsProposeItemModalOpen] = useState(false)

  const itemPrices = items.map((item) => item.price)
  const minPrice = Math.min(...itemPrices, 0)
  const maxPrice = Math.max(...itemPrices, 1000)

  const filteredAndSortedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (!statusFilter.includes('all') && !statusFilter.includes(item.status)) {
        return false
      }

      if (item.price < priceRange.min || item.price > priceRange.max) {
        return false
      }

      return true
    })

    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = a.price - b.price
          break
        case 'date':
          // For demo purposes, using a simple comparison
          // In real app, you'd parse actual dates
          const dateA = new Date(
            a.addedDate.includes('week') ? Date.now() - 7 * 24 * 60 * 60 * 1000 : Date.now() - 24 * 60 * 60 * 1000,
          )
          const dateB = new Date(
            b.addedDate.includes('week') ? Date.now() - 7 * 24 * 60 * 60 * 1000 : Date.now() - 24 * 60 * 60 * 1000,
          )
          comparison = dateA.getTime() - dateB.getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [items, sortBy, sortOrder, statusFilter, priceRange])

  const purchasedItems = items.filter((item) => item.status === 'purchased')
  const wantedItems = items.filter((item) => item.status === 'wanted')
  const reservedItems = items.filter((item) => item.status === 'reserved')
  const proposedItems = items.filter((item) => item.status === 'proposed')

  const completionPercentage = items.length > 0 ? (purchasedItems.length / items.length) * 100 : 0

  const handleAddWish = (wish: TWishFormData) => {
    console.log('New wish added:', wish)
    // Here you would typically add the item to your state/database
    setIsAddItemModalOpen(false)
  }

  const handleProposeWish = (wish: TProposedWishFormData) => {
    console.log('New wish proposed:', wish)
    // In a real application, this would send the item to a backend
    // with a 'proposed' status, and the owner/editors would see it
    // in a separate section for review/approval.
    setIsProposeItemModalOpen(false)
  }

  const handleUpdateWishlist = (wishlist: TWishlistFormData) => {
    console.log('Wishlist updated:', wishlist)

  }

  const handleSendShareEmail: (email: string, url: string) => Promise<void> = async (email, url) => {
    console.log(`Sending wishlist link to ${email}: ${url}`)
    // Simulate API call for sending email
    return new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const resetFilters = () => {
    setSortBy('date')
    setSortOrder('desc')
    setStatusFilter(['all'])
    setPriceRange({min: minPrice, max: maxPrice})
  }

  return (
    <div className={styles.wishlist}>
      <div className={styles.wishlist__header}>
        <div className={styles.wishlist__headerContent}>
          <div className={styles.wishlist__titleSection}>
            <h1 className={styles.wishlist__title}>{name}</h1>
            {ownerName && (
              <p className={styles.wishlist__owner}>Owned by {ownerName}</p>
            )}
            {createdDate && (
              <p className={styles.wishlist__creationDate}>Created on {createdDate}</p>
            )}
            <div className={styles.wishlist__badges}>
              <span
                className={`${styles.wishlist__badge} ${isPublic ? styles['wishlist__badge--public'] : styles['wishlist__badge--private']}`}
              >
                {isPublic ? 'Public' : 'Private'}
              </span>
              <span className={styles.wishlist__badge}>{items.length} items</span>
            </div>
          </div>

          <div className={styles.wishlist__actions}>
            {userIsOwner && (
              <button
                className={`${styles.wishlist__button} ${styles['wishlist__button--secondary']}`}
                onClick={() => {
                  eventBus.emit('wishlist:openUpdateModal', {
                    id,
                    name,
                    description,
                    isPublic,
                    coverImage: '',
                    allowComments: true,
                    allowSuggestions: true,
                    notifyOnPurchase: true,
                  })
                }}
              >
                Edit Wishlist
              </button>
            )}
            <button
              className={`${styles.wishlist__button} ${styles['wishlist__button--secondary']}`}
              onClick={() => setIsShareModalOpen(true)}
            >
              Share
            </button>
            {userIsOwner && (
              <button className={`${styles.wishlist__button} ${styles['wishlist__button--primary']}`}
                      onClick={() => setIsAddItemModalOpen(true)}>
                Add Item
              </button>
            )}
            {!userIsOwner && (
              <button
                className={`${styles.wishlist__button} ${styles['wishlist__button--secondary']}`}
                onClick={() => setIsProposeItemModalOpen(true)}
              >
                Propose Item
              </button>
            )}
          </div>
        </div>

        <p className={styles.wishlist__description}>{description}</p>

        <div className={styles.wishlist__stats}>
          <div className={styles.wishlist__stat}>
            <span className={styles.wishlist__statLabel}>Items Wanted</span>
            <span className={styles.wishlist__statValue}>{wantedItems.length}</span>
          </div>
          <div className={styles.wishlist__stat}>
            <span className={styles.wishlist__statLabel}>Items Purchased</span>
            <span className={styles.wishlist__statValue}>{purchasedItems.length}</span>
          </div>
          <div className={styles.wishlist__stat}>
            <span className={styles.wishlist__statLabel}>Completion</span>
            <span className={styles.wishlist__statValue}>{completionPercentage.toFixed(0)}%</span>
          </div>
        </div>

        <div className={styles.wishlist__progress}>
          <div className={styles.wishlist__progressBar}>
            <div className={styles.wishlist__progressFill} style={{width: `${completionPercentage}%`}}/>
          </div>
          <div className={styles.wishlist__progressStats}>
            <span className={styles.wishlist__progressStat}>{purchasedItems.length} purchased</span>
            <span className={styles.wishlist__progressStat}>{reservedItems.length} reserved</span>
            <span className={styles.wishlist__progressStat}>{wantedItems.length} wanted</span>
            <span className={styles.wishlist__progressStat}>{proposedItems.length} proposed</span>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.wishlist__empty}>
          <div className={styles.wishlist__emptyIcon}>🎁</div>
          <h3 className={styles.wishlist__emptyTitle}>No Items Yet</h3>
          <p className={styles.wishlist__emptyMessage}>Start building your wishlist by adding your first item!</p>
          <button className={styles.wishlist__emptyButton} onClick={onAddItem}>
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className={styles.wishlist__items}>
          <div className={styles.wishlist__controls}>
            <div className={styles.wishlist__controlsSection}>
              <h4 className={styles.wishlist__controlsTitle}>Sort By</h4>
              <div className={styles.wishlist__sortControls}>
                <select
                  className={styles.wishlist__select}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'date')}
                >
                  <option value="date">Date Added</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                </select>
                <button
                  className={`${styles.wishlist__sortButton} ${sortOrder === 'asc' ? styles['wishlist__sortButton--active'] : ''}`}
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {!userIsOwner && (
              <div className={styles.wishlist__controlsSection}>
                <h4 className={styles.wishlist__controlsTitle}>Filter by Status</h4>
                <div className={styles.wishlist__filterButtons}>
                  <button
                    className={`${styles.wishlist__filterButton} ${statusFilter.includes('all') ? styles['wishlist__filterButton--active'] : ''}`}
                    onClick={() => setStatusFilter(['all'])}
                  >
                    All ({items.length})
                  </button>
                  <button
                    className={`${styles.wishlist__filterButton} ${statusFilter.includes('wanted') ? styles['wishlist__filterButton--active'] : ''}`}
                    onClick={() => {
                      if (statusFilter.includes('wanted')) {
                        setStatusFilter(statusFilter.filter(s => s !== 'wanted'))
                      } else {
                        setStatusFilter(prev => prev.includes('all') ? ['wanted', 'proposed'] : [...prev.filter(s => s !== 'all'), 'wanted'])
                      }
                    }}
                  >
                    Open to Buy ({proposedItems.length + wantedItems.length})
                  </button>
                  <button
                    className={`${styles.wishlist__filterButton} ${statusFilter.includes('purchased') ? styles['wishlist__filterButton--active'] : ''}`}
                    onClick={() => {
                      if (statusFilter.includes('purchased')) {
                        setStatusFilter(statusFilter.filter(s => s !== 'purchased'))
                      } else {
                        setStatusFilter(prev => prev.includes('all') ? ['purchased'] : [...prev.filter(s => s !== 'all'), 'purchased'])
                      }
                    }}
                  >
                    Purchased ({purchasedItems.length})
                  </button>
                  <button
                    className={`${styles.wishlist__filterButton} ${statusFilter.includes('reserved') ? styles['wishlist__filterButton--active'] : ''}`}
                    onClick={() => {
                      if (statusFilter.includes('reserved')) {
                        setStatusFilter(statusFilter.filter(s => s !== 'reserved'))
                      } else {
                        setStatusFilter(prev => prev.includes('all') ? ['reserved'] : [...prev.filter(s => s !== 'all'), 'reserved'])
                      }
                    }}
                  >
                    Reserved ({reservedItems.length})
                  </button>
                </div>
              </div>
            )}


            <div className={styles.wishlist__controlsSection}>
              <h4 className={styles.wishlist__controlsTitle}>Price Range</h4>
              <div className={styles.wishlist__priceRange}>
                <div className={styles.wishlist__priceInputs}>
                  <input
                    type="number"
                    className={styles.wishlist__priceInput}
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange((prev) => ({...prev, min: Number(e.target.value) || 0}))}
                  />
                  <span className={styles.wishlist__priceSeparator}>-</span>
                  <input
                    type="number"
                    className={styles.wishlist__priceInput}
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange((prev) => ({...prev, max: Number(e.target.value) || 1000}))}
                  />
                </div>
                <button
                  className={styles.wishlist__resetButton}
                  onClick={() => setPriceRange({min: minPrice, max: maxPrice})}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className={styles.wishlist__itemsGrid}>
            {filteredAndSortedItems.map((item) => (
              <Wish
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                currency={item.currency}
                imageUrl={item.imageUrl}
                priority={item.priority}
                status={item.status}
                purchaseUrl={item.purchaseUrl}
                notes={item.notes}
                addedDate={item.addedDate}
                showOwnerAction={!!userIsOwner}
                showGuestAction={Boolean(user.id && !userIsOwner)}
              />
            ))}
          </div>

          {filteredAndSortedItems.length === 0 && items.length > 0 && (
            <div className={styles.wishlist__noResults}>
              <div className={styles.wishlist__noResultsIcon}>🔍</div>
              <h3 className={styles.wishlist__noResultsTitle}>No Items Match Your Filters</h3>
              <p className={styles.wishlist__noResultsMessage}>
                Try adjusting your filters or search criteria to see more items.
              </p>
              <button
                className={styles.wishlist__resetFiltersButton}
                onClick={() => {
                  resetFilters()
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      <div className={styles.wishlist__controlsSection}>
        <div className={styles.wishlist__resultsCount}>
          Showing {filteredAndSortedItems.length} of {items.length} items
        </div>
      </div>

      <AddWishModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSubmit={handleAddWish}
        useMock
      />

      <UpdateWishlistModal
        onSubmit={handleUpdateWishlist}
        initialData={{
          name,
          description,
          isPublic,
          coverImage: '',
          allowComments: true,
          allowSuggestions: true,
          notifyOnPurchase: true,
        }}
      />

      <ShareWishlistModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        wishlistUrl={`https://XXX.app/wishlist/${id}`}
        wishlistName={name}
        onSendEmail={handleSendShareEmail}
      />

      <ProposeWishModal
        isOpen={isProposeItemModalOpen}
        onClose={() => setIsProposeItemModalOpen(false)}
        onSubmit={handleProposeWish}
      />
    </div>
  )
}
