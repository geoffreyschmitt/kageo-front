'use client'

import {useMemo, useState} from 'react'
import {useTranslations} from 'next-intl'

import {TWishCard, WishCard} from '@/widgets/WishCard';

import {AddWishModal} from '@/features/AddWish'
import {ProposeWishModal} from '@/features/ProposeWish';
import {ShareWishlistModal, mockShareWishlistByEmail} from '@/features/ShareWishlist'
import {shareWishlist} from '@/shared/api/wishlist/shareWishlist'
import {UpdateWishlistModal} from '@/features/UpdateWishlist'
import {DeleteWishlistButton} from '@/features/DeleteWishlist'
import {EditWishModal} from '@/features/EditWish'
import {ContributeModal} from '@/features/ContributePot'
import {CreatePotButton} from '@/features/CreatePot'
import {CommentsSection} from '@/features/Comments'

import {TProposedWishFormData, TWishFormData} from '@/entities/wish'
import {TWishlistFormData} from '@/entities/wishlist';

import styles from './wishlist.module.css'
import {eventBus} from '@/shared/eventBus/';
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
  ownerProfileUrl?: string | null
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
  currency?: string
  onContribute?: (wishlistId: string, amount: number) => void
  onContributeError?: (wishlistId: string, amount: number) => void
  totalContributed?: number
  userContributed?: number
  userId?: string
  isLoggedIn?: boolean
  isInvited?: boolean
  potCreatorName?: string | null
  onPotCreated?: (creatorId: string, creatorName: string) => void
  useMock?: boolean
  userIsOwner: boolean
  isHistory?: boolean
  hasActivity?: boolean
  onUpdateWishlistMeta?: (wishlist: TWishlistFormData & { id: string }) => void
  onDeleteWishlist?: (wishlistId: string) => void
  onDeleteWishlistError?: (wishlistId: string) => void
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
  ownerProfileUrl = null,
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
  currency = '$',
  onAddWish,
  onProposeWish,
  onContribute,
  onContributeError,
  totalContributed = 0,
  userContributed = 0,
  userId = '',
  isLoggedIn = false,
  isInvited = false,
  potCreatorName = null,
  onPotCreated,
  useMock = false,
  userIsOwner = false,
  isHistory = false,
  hasActivity = false,
  onUpdateWishlistMeta,
  onDeleteWishlist,
  onDeleteWishlistError,
}: TWishlistPageProps) {
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
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false)

  const t = useTranslations('wishlist')
  const tComments = useTranslations('comments')

  // Owned wishlists can always be edited while active; once in history,
  // editing/deleting is only safe if no one has interacted with it yet
  // (no reservations/purchases/suggestions, no pot, no comments).
  const canEditWishlist = userIsOwner && (!isHistory || !hasActivity)
  const canDeleteWishlist = userIsOwner && isHistory && !hasActivity
  const showLockedNotice = userIsOwner && isHistory && hasActivity

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

  const handleUpdateWishlist = (wishlist: TWishlistFormData & { id: string }) => {
    onUpdateWishlistMeta?.(wishlist)
  }

  const handleDeleteWishlist = (wishlistId: string) => {
    onDeleteWishlist?.(wishlistId)
  }

  const handleDeleteWishlistError = (wishlistId: string) => {
    onDeleteWishlistError?.(wishlistId)
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
    if (useMock) return mockShareWishlistByEmail(email, url)
    return shareWishlist(id, email)
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
              <p className={styles.wishlist__owner}>
                {t('ownedByPrefix')}{' '}
                {ownerProfileUrl ? (
                  <a href={ownerProfileUrl} className={styles.wishlist__ownerLink} target="_blank" rel="noopener noreferrer">
                    {ownerName}
                  </a>
                ) : (
                  ownerName
                )}
              </p>
            )}
            {eventDate && (
              <p className={styles.wishlist__creationDate}>{t('eventOn', {date: eventDate})}</p>
            )}
            <div className={styles.wishlist__badges}>
              <span
                className={`${styles.wishlist__badge} ${isPublic ? styles['wishlist__badge--public'] : styles['wishlist__badge--private']}`}
              >
                {isPublic ? t('public') : t('private')}
              </span>
              <span className={styles.wishlist__badge}>{t('items', {count: items.length})}</span>
            </div>
          </div>

          <div className={styles.wishlist__actions}>
            {canEditWishlist && (
              <button
                className={`${styles.wishlist__button} ${styles['wishlist__button--secondary']}`}
                onClick={() => {
                  eventBus.emit('wishlist:openUpdateModal', {
                    id,
                    name,
                    description,
                    eventDate: eventDate ? new Date(eventDate) : undefined,
                    isPublic,
                    coverImage: '',
                  })
                }}
              >
                {t('editWishlist')}
              </button>
            )}
            {canDeleteWishlist && (
              <DeleteWishlistButton
                wishlistId={id}
                wishlistName={name}
                onDelete={handleDeleteWishlist}
                onError={handleDeleteWishlistError}
                className={`${styles.wishlist__button} ${styles['wishlist__button--danger']}`}
              >
                {t('deleteWishlist')}
              </DeleteWishlistButton>
            )}
            <button
              className={`${styles.wishlist__button} ${styles['wishlist__button--secondary']}`}
              onClick={() => setIsShareModalOpen(true)}
            >
              {t('share')}
            </button>
            {userIsOwner && !isHistory && (
              <button className={`${styles.wishlist__button} ${styles['wishlist__button--primary']}`}
                      onClick={() => setIsAddItemModalOpen(true)}>
                {t('addItem')}
              </button>
            )}
            {!userIsOwner && !isHistory && (
              <button
                className={`${styles.wishlist__button} ${styles['wishlist__button--amber']}`}
                onClick={() => setIsProposeItemModalOpen(true)}
              >
                {t('suggestWish')}
              </button>
            )}
          </div>
          {showLockedNotice && (
            <p className={styles.wishlist__lockedNotice}>{t('cannotEditNotice')}</p>
          )}
        </div>

        <p className={styles.wishlist__description}>{description}</p>

        <div className={styles.wishlist__stats}>
          {/* Completion — hero stat, visually dominant */}
          <div className={`${styles.wishlist__stat} ${styles['wishlist__stat--hero']}`}>
            <span className={styles.wishlist__statValue}>{completionPercentage.toFixed(0)}%</span>
            <span className={styles.wishlist__statLabel}>{t('complete')}</span>
          </div>
          {/* Supporting stats */}
          <div className={styles.wishlist__stat}>
            <span className={styles.wishlist__statLabel}>{t('wanted')}</span>
            <span className={styles.wishlist__statValue}>{wantedItems.length}</span>
          </div>
          <div className={styles.wishlist__stat}>
            <span className={styles.wishlist__statLabel}>{t('purchased')}</span>
            <span className={styles.wishlist__statValue}>{purchasedItems.length}</span>
          </div>
        </div>

        <div className={styles.wishlist__progress}>
          <div className={styles.wishlist__progressBar}>
            <div className={styles.wishlist__progressFill} style={{width: `${completionPercentage}%`}}/>
          </div>
          <div className={styles.wishlist__progressStats}>
            <span className={styles.wishlist__progressStat}>{t('purchasedCount', {count: purchasedItems.length})}</span>
            <span className={styles.wishlist__progressStat}>{t('reservedCount', {count: reservedItems.length})}</span>
            <span className={styles.wishlist__progressStat}>{t('wantedCount', {count: wantedItems.length})}</span>
            {!userIsOwner && proposedItems.length > 0 && (
              <span className={styles.wishlist__progressStat}>{t('proposedCount', {count: proposedItems.length})}</span>
            )}
          </div>
        </div>
      </div>

      {!userIsOwner && !isHistory && (
        potCreatorName ? (
          <div className={styles.wishlist__pot}>
            <div className={styles.wishlist__potInner}>
              <div className={styles.wishlist__potIcon} aria-hidden="true">
                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="18" cy="18" r="16" fill="#eaf2eb" stroke="#b8dbb9" strokeWidth="1.2"/>
                  <path d="M18 27 Q13 22 11 17 Q9 12 14 10 Q17 9 19 13 Q21 9 24 10 Q29 12 22 21 Q21 23 18 27Z" fill="#3f6845" opacity="0.7"/>
                  <path d="M18 27 Q18 21 18 16" stroke="#3f6845" strokeWidth="1" opacity="0.45" strokeLinecap="round"/>
                  <path d="M18 18 Q15 15 12 14" stroke="#3f6845" strokeWidth="0.9" opacity="0.35" strokeLinecap="round"/>
                  <path d="M18 22 Q21 19 24 18" stroke="#3f6845" strokeWidth="0.9" opacity="0.35" strokeLinecap="round"/>
                </svg>
              </div>
              <div className={styles.wishlist__potText}>
                <p className={styles.wishlist__potTitle}>{t('potTitle')}</p>
                <p className={styles.wishlist__potSub}>
                  {totalContributed > 0
                    ? <><strong>{currency}{totalContributed.toFixed(2)}</strong> {t('potPledgedSuffix')}</>
                    : t('potChipIn', {ownerName})
                  }
                </p>
                {userContributed > 0 && (
                  <p className={styles.wishlist__potUserContrib}>
                    {t('potUserPledgedPrefix')} <strong>{currency}{userContributed.toFixed(2)}</strong>
                  </p>
                )}
              </div>
            </div>
            <button
              className={`${styles.wishlist__button} ${styles['wishlist__button--pot']}`}
              onClick={() => setIsContributeModalOpen(true)}
            >
              {t('contributeToThePot')}
            </button>
          </div>
        ) : (
          <div className={styles.wishlist__pot}>
            <div className={styles.wishlist__potInner}>
              <div className={styles.wishlist__potIcon} aria-hidden="true">
                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="18" cy="18" r="16" fill="#eaf2eb" stroke="#b8dbb9" strokeWidth="1.2"/>
                  <path d="M18 27 Q13 22 11 17 Q9 12 14 10 Q17 9 19 13 Q21 9 24 10 Q29 12 22 21 Q21 23 18 27Z" fill="#3f6845" opacity="0.7"/>
                  <path d="M18 27 Q18 21 18 16" stroke="#3f6845" strokeWidth="1" opacity="0.45" strokeLinecap="round"/>
                  <path d="M18 18 Q15 15 12 14" stroke="#3f6845" strokeWidth="0.9" opacity="0.35" strokeLinecap="round"/>
                  <path d="M18 22 Q21 19 24 18" stroke="#3f6845" strokeWidth="0.9" opacity="0.35" strokeLinecap="round"/>
                </svg>
              </div>
              <div className={styles.wishlist__potText}>
                <p className={styles.wishlist__potTitle}>{t('potTitle')}</p>
                <p className={styles.wishlist__potSub}>
                  {t('potNotStarted', {ownerName})}
                </p>
              </div>
            </div>
            <CreatePotButton
              wishlistId={id}
              ownerName={ownerName}
              isLoggedIn={isLoggedIn}
              isInvited={isInvited}
              onPotCreated={(creatorId, creatorName) => onPotCreated?.(creatorId, creatorName)}
              useMock={useMock}
            />
          </div>
        )
      )}

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
          <h3 className={styles.wishlist__emptyTitle}>{t('emptyTitle')}</h3>
          <p className={styles.wishlist__emptyMessage}>{t('emptyMessage')}</p>
          {userIsOwner && (
            <button className={styles.wishlist__emptyButton} onClick={onAddItem}>
              {t('emptyButton')}
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
              <span>{t('filtersAndSort')}</span>
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
              <h4 className={styles.wishlist__controlsTitle}>{t('sortByLabel')}</h4>
              <div className={styles.wishlist__sortControls}>
                <select
                  className={styles.wishlist__select}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'date' | 'priority')}
                >
                  <option value="date">{t('sortDateAdded')}</option>
                  <option value="name">{t('sortName')}</option>
                  <option value="price">{t('sortPrice')}</option>
                  <option value="priority">{t('sortPriority')}</option>
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
                <h4 className={styles.wishlist__controlsTitle}>{t('filterByStatus')}</h4>
                <div className={styles.wishlist__filterButtons}>
                  <button
                    className={`${styles.wishlist__filterButton} ${statusFilter.includes('all') ? styles['wishlist__filterButton--active'] : ''}`}
                    onClick={() => setStatusFilter(['all'])}
                  >
                    {t('filterAll', {count: items.filter(i => i.status !== 'proposed').length})}
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
                    {t('filterOpenToBuy', {count: wantedItems.length})}
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
                    {t('filterPurchased', {count: purchasedItems.length})}
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
                    {t('filterReserved', {count: reservedItems.length})}
                  </button>
                </div>
              </div>
            )}


            <div className={styles.wishlist__controlsSection}>
              <h4 className={styles.wishlist__controlsTitle}>{t('priceRangeLabel')}</h4>
              <div className={styles.wishlist__priceRange}>
                <div className={styles.wishlist__priceInputs}>
                  <input
                    type="number"
                    className={styles.wishlist__priceInput}
                    placeholder={t('priceMinPlaceholder')}
                    value={priceRange.min}
                    onChange={(e) => setPriceRange((prev) => ({...prev, min: Number(e.target.value) || 0}))}
                  />
                  <span className={styles.wishlist__priceSeparator}>-</span>
                  <input
                    type="number"
                    className={styles.wishlist__priceInput}
                    placeholder={t('priceMaxPlaceholder')}
                    value={priceRange.max}
                    onChange={(e) => setPriceRange((prev) => ({...prev, max: Number(e.target.value) || 1000}))}
                  />
                </div>
                <button
                  className={styles.wishlist__resetButton}
                  onClick={() => setPriceRange({min: minPrice, max: maxPrice})}
                >
                  {t('resetButton')}
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
                  {t('mostWantedTitle')}
                </h2>
                <p className={styles.wishlist__mostWantedMeta}>
                  {t('mostWantedMeta', {count: mostWantedItems.length})}
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
                    showOwnerAction={!isHistory && !!userIsOwner}
                    isOwner={userIsOwner}
                    showGuestAction={!isHistory && Boolean(isLoggedIn && !userIsOwner)}
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
                    userId={userId}
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
                showOwnerAction={!isHistory && !!userIsOwner}
                isOwner={userIsOwner}
                showGuestAction={!isHistory && Boolean(isLoggedIn && !userIsOwner)}
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
                userId={userId}
                useMock={useMock}
              />
            ))}
          </div>

          {mostWantedItems.length === 0 && regularItems.length === 0 && items.filter(i => i.status !== 'proposed').length > 0 && (
            <div className={styles.wishlist__noResults}>
              <div className={styles.wishlist__noResultsIcon}>🔍</div>
              <h3 className={styles.wishlist__noResultsTitle}>{t('noResultsTitle')}</h3>
              <p className={styles.wishlist__noResultsMessage}>
                {t('noResultsMessage')}
              </p>
              <button
                className={styles.wishlist__resetFiltersButton}
                onClick={() => {
                  resetFilters()
                }}
              >
                {t('resetAllFilters')}
              </button>
            </div>
          )}

          {/* ── Suggestions Section (non-owners only, not in history) ── */}
          {!userIsOwner && !isHistory && (
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
                  <h2 className={styles.wishlist__suggestionsTitle}>{t('suggestionsTitle')}</h2>
                  <p className={styles.wishlist__suggestionsMeta}>
                    {allProposedItems.length === 0
                      ? t('suggestionsEmptyMeta')
                      : proposedItems.length < allProposedItems.length
                        ? t('suggestionsPartialMeta', {shown: proposedItems.length, total: allProposedItems.length})
                        : t('suggestionsAllMeta', {count: proposedItems.length})}
                  </p>
                </div>
              </div>

              <div className={styles.wishlist__suggestionsCTA}>
                <div className={styles.wishlist__suggestionsCTAText}>
                  <p className={styles.wishlist__suggestionsCTATitle}>{t('suggestionsCtaTitle')}</p>
                  <p className={styles.wishlist__suggestionsCTASub}>
                    {t('suggestionsCtaSub', {ownerName})}
                  </p>
                </div>
                <button
                  className={`${styles.wishlist__button} ${styles['wishlist__button--amber']}`}
                  onClick={() => setIsProposeItemModalOpen(true)}
                >
                  {t('suggestWish')}
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
                      isOwner={userIsOwner}
                      showGuestAction={Boolean(isLoggedIn && !userIsOwner)}
                      onReserve={onReserveWish}
                      onReserveError={onReserveError}
                      onCancelReservation={onCancelReservation}
                      onCancelError={onCancelError}
                      onMarkPurchased={onMarkPurchasedWish}
                      onMarkPurchasedError={onMarkPurchasedError}
                      userId={userId}
                      useMock={useMock}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.wishlist__suggestionsEmpty}>
                  <p>{t('suggestionsEmpty')}</p>
                </div>
              )}
            </div>
          )}

          {!userIsOwner && !isHistory && (
            <div className={styles.wishlist__commentsSection}>
              <CommentsSection
                target={{ type: 'wishlist', wishlistId: id }}
                enabled={!userIsOwner}
                emptyMessage={tComments('wishlistEmpty', { ownerName })}
              />
            </div>
          )}
        </div>
      )}

      <div className={styles.wishlist__controlsSection}>
        <div className={styles.wishlist__resultsCount}>
          {t('resultsCount', {shown: filteredAndSortedItems.length, total: items.filter(i => i.status !== 'proposed').length})}
        </div>
      </div>

      {!isHistory && !userIsOwner && potCreatorName && (
        <ContributeModal
          isOpen={isContributeModalOpen}
          onClose={() => setIsContributeModalOpen(false)}
          wishlistId={id}
          eventName={name}
          ownerName={ownerName}
          creatorName={potCreatorName}
          isLoggedIn={isLoggedIn}
          totalContributed={totalContributed}
          userContributed={userContributed}
          currency={currency}
          onContribute={onContribute}
          onError={onContributeError}
          useMock={useMock}
        />
      )}

      {canEditWishlist && (
        <UpdateWishlistModal
          onSubmit={handleUpdateWishlist}
          initialData={{
            name,
            description,
            eventDate: eventDate ? new Date(eventDate).toISOString().slice(0, 10) : '',
            isPublic,
            coverImage: '',
            allowSuggestions: true,
          }}
        />
      )}

      {!isHistory && (
        <>
          <AddWishModal
            isOpen={isAddItemModalOpen}
            onClose={() => setIsAddItemModalOpen(false)}
            onSubmit={handleAddWish}
            wishlistId={id}
            useMock={useMock}
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
        </>
      )}

      <ShareWishlistModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        wishlistUrl={generateShareUrl(id)}
        wishlistName={name}
        onSendEmail={handleSendShareEmail}
      />
    </div>
  )
}
