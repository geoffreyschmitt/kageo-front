'use client'

import {useMemo, useState} from 'react'

import {TWishCard, WishCard} from '@/widgets/WishCard';

import {AddWishModal} from '@/features/AddWish'
import {ProposeWishModal} from '@/features/ProposeWish';
import {ShareWishlistModal, mockShareWishlistByEmail} from '@/features/ShareWishlist'
import {UpdateWishlistModal} from '@/features/UpdateWishlist'
import {EditWishModal} from '@/features/EditWish'

import {TProposedWishFormData, TWishFormData} from '@/entities/wish'
import {TWishlistFormData} from '@/entities/wishlist';

import styles from './wishlist.module.css'
import {eventBus} from '@/shared/eventBus/';
import {mockUserPrivate} from '@/entities/user';
import {generateShareUrl} from '@/shared/lib/generateShareUrl';


type TWishlistPageProps = {
  id: string
  name: string
  description: string
  items: TWishCard[]
  isPublic: boolean
  eventDate: string
  ownerId: string
  ownerName: string
  onAddItem?: () => void
  onShareWishlist?: () => void
  onEditWishlist?: () => void
  onReserveWish?: (wishId: string, reservedBy: string) => void
  onReserveError?: (wishId: string) => void
  onCancelReservation?: (wishId: string) => void
  onCancelError?: (wishId: string) => void
  onMarkPurchasedWish?: (wishId: string, userId: string) => void
  onMarkPurchasedError?: (wishId: string) => void
  onRemovePurchasedWish?: (wishId: string) => void
  onRemovePurchasedError?: (wishId: string) => void
  onDeleteWish?: (wishId: string) => void
  onDeleteError?: (wishId: string) => void
  onEditWish?: (wish: TWishCard) => void
  onUpdateWish?: (wishId: string, updatedWish: TWishFormData & { id: string }) => void
  onAddWish?: (wish: TWishFormData & { id: string }) => void
  onProposeWish?: (wish: TProposedWishFormData & { id: string }) => void
  useMock?: boolean
  userIsOwner: boolean
}

export default function Wishlist({
  id,
  name,
  description,
  items = [],
  isPublic,
  eventDate,
  ownerId,
  ownerName,
  onAddItem,
  onReserveWish,
  onReserveError,
  onCancelReservation,
  onCancelError,
  onMarkPurchasedWish,
  onMarkPurchasedError,
  onRemovePurchasedWish,
  onRemovePurchasedError,
  onDeleteWish,
  onDeleteError,
  onEditWish,
  onUpdateWish,
  onAddWish,
  onProposeWish,
  useMock = false,
  userIsOwner = false,
}: TWishlistPageProps) {
  const user = mockUserPrivate

  const [sortBy, setSortBy] = useState<'name' | 'price' | 'date' | 'priority'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<('all' | 'wanted' | 'purchased' | 'reserved' | 'proposed')[]>(['all'])
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({min: 0, max: 1000})
  const [isControlsOpen, setIsControlsOpen] = useState(false)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isProposeItemModalOpen, setIsProposeItemModalOpen] = useState(false)
  const [isEditWishModalOpen, setIsEditWishModalOpen] = useState(false)
  const [editingWish, setEditingWish] = useState<TWishCard | null>(null)

  const itemPrices = items.map((item) => item.price)
  const minPrice = Math.min(...itemPrices, 0)
  const maxPrice = Math.max(...itemPrices, 1000)

  const compareItems = (a: TWishCard, b: TWishCard) => {
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
      case 'priority': {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        comparison = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
        break
      }
    }
    return sortOrder === 'asc' ? comparison : -comparison
  }

  const filteredAndSortedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      // Proposed items are always shown in their own section, never in the main grid
      if (item.status === 'proposed' || item.isProposed) return false

      if (!statusFilter.includes('all') && !statusFilter.includes(item.status)) {
        return false
      }

      if (item.price < priceRange.min || item.price > priceRange.max) {
        return false
      }

      return true
    })

    filtered.sort(compareItems)

    return filtered
  }, [items, sortBy, sortOrder, statusFilter, priceRange])

  const { mostWantedItems, regularItems } = useMemo(() => {
    const mostWanted = filteredAndSortedItems.filter(
      (item) => item.priority === 'high' && item.status !== 'purchased'
    )
    const regular = filteredAndSortedItems.filter(
      (item) => item.priority !== 'high' || item.status === 'purchased'
    )
    return { mostWantedItems: mostWanted, regularItems: regular }
  }, [filteredAndSortedItems])

  const purchasedItems = items.filter((item) => item.status === 'purchased')
  const wantedItems = items.filter((item) => item.status === 'wanted')
  const reservedItems = items.filter((item) => item.status === 'reserved')
  const allProposedItems = items.filter((item) => item.isProposed || item.status === 'proposed')
  const proposedItems = useMemo(() => {
    const filtered = allProposedItems.filter((item) => item.price >= priceRange.min && item.price <= priceRange.max)
    filtered.sort(compareItems)
    return filtered
  }, [allProposedItems, sortBy, sortOrder, priceRange])

  const completionPercentage = items.length > 0 ? (purchasedItems.length / items.length) * 100 : 0

  const handleAddWish = (wish: TWishFormData & { id: string }) => {
    // Call parent callback to update state
    if (onAddWish) {
      onAddWish(wish)
    }
    setIsAddItemModalOpen(false)
  }

  const handleProposeWish = (wish: TProposedWishFormData & { id: string }) => {
    // Call parent callback to update state
    if (onProposeWish) {
      onProposeWish(wish)
    }
    setIsProposeItemModalOpen(false)
  }

  const handleUpdateWishlist = (wishlist: TWishlistFormData) => {
    console.log('Wishlist updated:', wishlist)

  }

  const handleEditWish = (wish: TWishCard) => {
    setEditingWish(wish)
    setIsEditWishModalOpen(true)
    if (onEditWish) {
      onEditWish(wish)
    }
  }

  const handleUpdateWish = (updatedWish: TWishFormData & { id: string }) => {
    if (onUpdateWish && editingWish) {
      onUpdateWish(editingWish.id, updatedWish)
    }
    setIsEditWishModalOpen(false)
    setEditingWish(null)
  }

  const handleSendShareEmail: (email: string, url: string) => Promise<void> = async (email, url) => {
    return mockShareWishlistByEmail(email, url)
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
            {eventDate && (
              <p className={styles.wishlist__creationDate}>Event on {eventDate}</p>
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
                className={`${styles.wishlist__button} ${styles['wishlist__button--amber']}`}
                onClick={() => setIsProposeItemModalOpen(true)}
              >
                Suggest a Wish
              </button>
            )}
          </div>
        </div>

        <p className={styles.wishlist__description}>{description}</p>

        <div className={styles.wishlist__stats}>
          {/* Completion — hero stat, visually dominant */}
          <div className={`${styles.wishlist__stat} ${styles['wishlist__stat--hero']}`}>
            <span className={styles.wishlist__statValue}>{completionPercentage.toFixed(0)}%</span>
            <span className={styles.wishlist__statLabel}>Complete</span>
          </div>
          {/* Supporting stats */}
          <div className={styles.wishlist__stat}>
            <span className={styles.wishlist__statLabel}>Wanted</span>
            <span className={styles.wishlist__statValue}>{wantedItems.length}</span>
          </div>
          <div className={styles.wishlist__stat}>
            <span className={styles.wishlist__statLabel}>Purchased</span>
            <span className={styles.wishlist__statValue}>{purchasedItems.length}</span>
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
            {!userIsOwner && proposedItems.length > 0 && (
              <span className={styles.wishlist__progressStat}>{proposedItems.length} suggested</span>
            )}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.wishlist__empty}>
          <div className={styles.wishlist__emptyIllustration} aria-hidden="true">
            <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Gift box body */}
              <rect x="28" y="76" width="104" height="52" rx="5" fill="#f2ede5" stroke="#d6cec4" strokeWidth="1.5"/>
              {/* Gift box lid */}
              <rect x="22" y="60" width="116" height="22" rx="5" fill="#ebe5da" stroke="#d6cec4" strokeWidth="1.5"/>
              {/* Vertical ribbon */}
              <rect x="70" y="60" width="20" height="68" rx="2" fill="#eaf2eb" stroke="#b8dbb9" strokeWidth="1"/>
              {/* Bow — left loop */}
              <path d="M80 60 C62 38 36 42 40 58 C44 72 72 65 80 60Z" fill="#eaf2eb" stroke="#3f6845" strokeWidth="1.2" opacity="0.85"/>
              {/* Bow — right loop */}
              <path d="M80 60 C98 38 124 42 120 58 C116 72 88 65 80 60Z" fill="#eaf2eb" stroke="#3f6845" strokeWidth="1.2" opacity="0.85"/>
              {/* Bow center */}
              <ellipse cx="80" cy="60" rx="7" ry="5" fill="#3f6845" opacity="0.35"/>
              {/* Left botanical sprig */}
              <path d="M28 90 Q14 80 18 68 Q24 75 28 90Z" fill="#3f6845" opacity="0.25"/>
              <path d="M28 104 Q10 96 14 82 Q22 88 28 104Z" fill="#3f6845" opacity="0.18"/>
              <line x1="28" y1="68" x2="28" y2="112" stroke="#3f6845" strokeWidth="1" opacity="0.2"/>
              {/* Right botanical sprig */}
              <path d="M132 90 Q146 80 142 68 Q136 75 132 90Z" fill="#3f6845" opacity="0.25"/>
              <path d="M132 104 Q150 96 146 82 Q138 88 132 104Z" fill="#3f6845" opacity="0.18"/>
              <line x1="132" y1="68" x2="132" y2="112" stroke="#3f6845" strokeWidth="1" opacity="0.2"/>
              {/* Small decorative dots */}
              <circle cx="80" cy="22" r="3" fill="#6e3c0c" opacity="0.2"/>
              <circle cx="66" cy="28" r="2" fill="#3f6845" opacity="0.2"/>
              <circle cx="94" cy="28" r="2" fill="#3f6845" opacity="0.2"/>
            </svg>
          </div>
          <h3 className={styles.wishlist__emptyTitle}>Nothing here yet</h3>
          <p className={styles.wishlist__emptyMessage}>Add your first wish and start building something beautiful.</p>
          {userIsOwner && (
            <button className={styles.wishlist__emptyButton} onClick={onAddItem}>
              Add your first wish
            </button>
          )}
        </div>
      ) : (
        <div className={styles.wishlist__items}>
          <div className={styles.wishlist__controls}>
            <button
              className={styles.wishlist__controlsToggle}
              onClick={() => setIsControlsOpen(prev => !prev)}
              aria-expanded={isControlsOpen}
            >
              <span>Filters &amp; Sort</span>
              <svg
                className={`${styles.wishlist__controlsToggleIcon} ${isControlsOpen ? styles['wishlist__controlsToggleIcon--open'] : ''}`}
                width="14" height="14" viewBox="0 0 14 14" fill="none"
              >
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className={`${styles.wishlist__controlsBody} ${isControlsOpen ? styles['wishlist__controlsBody--open'] : ''}`}>
            <div className={styles.wishlist__controlsBodyInner}>
            <div className={styles.wishlist__controlsSection}>
              <h4 className={styles.wishlist__controlsTitle}>Sort By</h4>
              <div className={styles.wishlist__sortControls}>
                <select
                  className={styles.wishlist__select}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'date' | 'priority')}
                >
                  <option value="date">Date Added</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="priority">Priority</option>
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
                    All ({items.filter(i => i.status !== 'proposed').length})
                  </button>
                  <button
                    className={`${styles.wishlist__filterButton} ${statusFilter.includes('wanted') ? styles['wishlist__filterButton--active'] : ''}`}
                    onClick={() => {
                      if (statusFilter.includes('wanted')) {
                        setStatusFilter(statusFilter.filter(s => s !== 'wanted'))
                      } else {
                        setStatusFilter(prev => prev.includes('all') ? ['wanted'] : [...prev.filter(s => s !== 'all'), 'wanted'])
                      }
                    }}
                  >
                    Open to Buy ({wantedItems.length})
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
            </div>{/* wishlist__controlsBodyInner */}
            </div>{/* wishlist__controlsBody */}
          </div>

          {mostWantedItems.length > 0 && (
            <div className={styles.wishlist__mostWantedSection}>
              <div className={styles.wishlist__mostWantedPanel}>
              <div className={styles.wishlist__mostWantedHeaderWrap}>
                <h2 className={styles.wishlist__mostWantedTitle}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 0l2.35 4.76 5.25.77-3.8 3.7.9 5.24L8 12.18l-4.7 2.29.9-5.24-3.8-3.7 5.25-.77z"/>
                  </svg>
                  Most Wanted
                </h2>
                <p className={styles.wishlist__mostWantedMeta}>
                  {mostWantedItems.length} high-priority wish{mostWantedItems.length !== 1 ? 'es' : ''}
                </p>
              </div>
              <div className={styles.wishlist__itemsGrid}>
                {mostWantedItems.map((item) => (
                  <WishCard
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
                    reservedBy={item.reservedBy}
                    purchasedBy={item.purchasedBy}
                    showOwnerAction={!!userIsOwner}
                    showGuestAction={Boolean(user.id && !userIsOwner)}
                    onReserve={onReserveWish}
                    onReserveError={onReserveError}
                    onCancelReservation={onCancelReservation}
                    onCancelError={onCancelError}
                    onMarkPurchased={onMarkPurchasedWish}
                    onMarkPurchasedError={onMarkPurchasedError}
                    onRemovePurchased={onRemovePurchasedWish}
                    onRemovePurchasedError={onRemovePurchasedError}
                    onDeleteWish={onDeleteWish}
                    onDeleteError={onDeleteError}
                    onEditWish={handleEditWish}
                    userId={user.id}
                    useMock={useMock}
                  />
                ))}
              </div>
              </div>
            </div>
          )}


          <div className={styles.wishlist__itemsGrid}>
            {regularItems.map((item) => (
              <WishCard
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
                reservedBy={item.reservedBy}
                purchasedBy={item.purchasedBy}
                showOwnerAction={!!userIsOwner}
                showGuestAction={Boolean(user.id && !userIsOwner)}
                onReserve={onReserveWish}
                onReserveError={onReserveError}
                onCancelReservation={onCancelReservation}
                onCancelError={onCancelError}
                onMarkPurchased={onMarkPurchasedWish}
                onMarkPurchasedError={onMarkPurchasedError}
                onRemovePurchased={onRemovePurchasedWish}
                onRemovePurchasedError={onRemovePurchasedError}
                onDeleteWish={onDeleteWish}
                onDeleteError={onDeleteError}
                onEditWish={handleEditWish}
                userId={user.id}
                useMock={useMock}
              />
            ))}
          </div>

          {mostWantedItems.length === 0 && regularItems.length === 0 && items.filter(i => i.status !== 'proposed').length > 0 && (
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

          {/* ── Suggestions Section (non-owners only) ── */}
          {!userIsOwner && (
            <div className={styles.wishlist__suggestionsSection}>
              <div className={styles.wishlist__suggestionsDivider} aria-hidden="true">
                <div className={styles.wishlist__suggestionsDividerLine} />
                <div className={styles.wishlist__suggestionsDividerIcon}>
                  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 34 Q14 26 12 18 Q10 10 18 8 Q22 7 24 12 Q26 7 30 8 Q38 10 28 22 Q26 26 20 34Z" fill="currentColor" opacity="0.55"/>
                    <path d="M20 34 Q20 28 20 20" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                    <path d="M20 22 Q16 18 12 16" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
                    <path d="M20 26 Q24 22 28 20" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
                  </svg>
                </div>
                <div className={styles.wishlist__suggestionsDividerLine} />
              </div>

              <div className={styles.wishlist__suggestionsHeaderWrap}>
                <div>
                  <h2 className={styles.wishlist__suggestionsTitle}>Suggestions</h2>
                  <p className={styles.wishlist__suggestionsMeta}>
                    {allProposedItems.length === 0
                      ? 'No suggestions yet — yours could be first'
                      : proposedItems.length < allProposedItems.length
                        ? `${proposedItems.length} of ${allProposedItems.length} idea${allProposedItems.length !== 1 ? 's' : ''} match your filters`
                        : `${proposedItems.length} idea${proposedItems.length !== 1 ? 's' : ''} proposed by friends`}
                  </p>
                </div>
              </div>

              <div className={styles.wishlist__suggestionsCTA}>
                <div className={styles.wishlist__suggestionsCTAText}>
                  <p className={styles.wishlist__suggestionsCTATitle}>Have something in mind?</p>
                  <p className={styles.wishlist__suggestionsCTASub}>
                    Give other gifters a head start — propose what to buy for {ownerName}
                  </p>
                </div>
                <button
                  className={`${styles.wishlist__button} ${styles['wishlist__button--amber']}`}
                  onClick={() => setIsProposeItemModalOpen(true)}
                >
                  Suggest a Wish
                </button>
              </div>

              {proposedItems.length > 0 ? (
                <div className={styles.wishlist__itemsGrid}>
                  {proposedItems.map((item) => (
                    <WishCard
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
                      reservedBy={item.reservedBy}
                      purchasedBy={item.purchasedBy}
                      showOwnerAction={false}
                      showGuestAction={Boolean(user.id && !userIsOwner)}
                      onReserve={onReserveWish}
                      onReserveError={onReserveError}
                      onCancelReservation={onCancelReservation}
                      onCancelError={onCancelError}
                      onMarkPurchased={onMarkPurchasedWish}
                      onMarkPurchasedError={onMarkPurchasedError}
                      userId={user.id}
                      useMock={useMock}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.wishlist__suggestionsEmpty}>
                  <p>No suggestions yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.wishlist__controlsSection}>
        <div className={styles.wishlist__resultsCount}>
          Showing {filteredAndSortedItems.length} of {items.filter(i => i.status !== 'proposed').length} items
        </div>
      </div>

      <AddWishModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSubmit={handleAddWish}
        wishlistId={id}
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
        wishlistUrl={generateShareUrl(id)}
        wishlistName={name}
        onSendEmail={handleSendShareEmail}
      />

      <ProposeWishModal
        isOpen={isProposeItemModalOpen}
        onClose={() => setIsProposeItemModalOpen(false)}
        onSubmit={handleProposeWish}
        wishlistId={id}
      />

      {editingWish && (
        <EditWishModal
          isOpen={isEditWishModalOpen}
          onClose={() => {
            setIsEditWishModalOpen(false)
            setEditingWish(null)
          }}
          onSubmit={handleUpdateWish}
          wishId={editingWish.id}
          initialData={{
            name: editingWish.name,
            description: editingWish.description,
            price: editingWish.price,
            currency: editingWish.currency,
            imageUrl: editingWish.imageUrl,
            priority: editingWish.priority,
            purchaseUrl: editingWish.purchaseUrl || '',
            notes: editingWish.notes || '',
          }}
          useMock={useMock}
        />
      )}
    </div>
  )
}
