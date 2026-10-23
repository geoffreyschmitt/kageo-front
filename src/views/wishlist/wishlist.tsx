'use client'

import {useCallback, useMemo, useState} from 'react'

import {useLocale, useTranslations} from 'next-intl'


import {PotCard} from '@/widgets/PotCard'
import {TWishCard, WishCard} from '@/widgets/WishCard';

import {AddWishModal} from '@/features/AddWish'
import {CommentsSection, CommentsDrawer} from '@/features/Comments'
import {DeleteWishlistButton} from '@/features/DeleteWishlist'
import {EditWishModal} from '@/features/EditWish'
import {ProposeWishModal} from '@/features/ProposeWish';
import {ShareWishlistModal} from '@/features/ShareWishlist'
import {UpdateWishlistModal} from '@/features/UpdateWishlist'


import {TProposedWishFormData, TWishFormData} from '@/entities/wish'
import {TWishlistFormData} from '@/entities/wishlist';

import type {TGiftPotView} from '@/shared/api/wish/getGiftPot';
import type {TGetPotResponse} from '@/shared/api/wishlist/getPot';
import {shareWishlist} from '@/shared/api/wishlist/shareWishlist'
import {eventBus} from '@/shared/eventBus/';
import {formatDate} from '@/shared/lib/formatDate';
import {generateShareUrl} from '@/shared/lib/generateShareUrl';
import {LoginPromptModal} from '@/shared/ui'

import styles from './wishlist.module.css'


type TWishlistPageProps = {
  id: string
  name: string
  description: string
  items: TWishCard[]
  isPublic: boolean
  eventDate: string
  coverImage?: string
  allowSuggestions?: boolean
  ownerId: string
  ownerName: string
  ownerProfileUrl?: string | null
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
  onToggleFavorite?: (wishId: string, favorite: boolean) => void
  onUpdateWish?: (wishId: string, updatedWish: TWishFormData & { id: string }) => void
  onAddWish?: (wish: TWishFormData & { id: string }) => void
  onProposeWish?: (wish: TProposedWishFormData & { id: string }) => void
  currency?: string
  onContribute?: (wishlistId: string, amount: number) => void
  onContributeError?: (wishlistId: string, amount: number) => void
  onContributeRemoved?: (wishlistId: string, removedAmount: number) => void
  pot?: TGetPotResponse | null
  onPotRefreshed?: (view: TGetPotResponse | null) => void
  userId?: string
  isLoggedIn?: boolean
  isInvited?: boolean
  onPotCreated?: (creatorId: string, creatorName: string) => void
  // Per-wish gift pots, keyed by wish id (undefined entry = the viewer must not see a pot)
  giftPots?: Record<string, TGiftPotView | null>
  onGiftPotCreated?: (wishId: string, creatorId: string, creatorName: string) => void
  onContributeGiftPot?: (wishId: string, delta: number) => void
  onContributeGiftPotError?: (wishId: string, delta: number) => void
  onGiftPotRemoved?: (wishId: string, removedAmount: number) => void
  onGiftPotRefreshed?: (wishId: string, view: TGiftPotView | null) => void
  eventName?: string
  userIsOwner: boolean
  isHistory?: boolean
  hasActivity?: boolean
  onUpdateWishlistMeta?: (wishlist: TWishlistFormData & { id: string }) => void
  onDeleteWishlist?: (wishlistId: string) => void
  onDeleteWishlistError?: (wishlistId: string) => void
}

// `addedDate` is a display label, so date sorting reads the ISO `createdAt` instead.
const addedAt = (item: TWishCard) => Date.parse(item.createdAt ?? '') || 0

export default function Wishlist({
  id,
  name,
  description,
  items = [],
  isPublic,
  eventDate,
  coverImage = '',
  allowSuggestions = true,
  ownerName,
  ownerProfileUrl = null,
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
  onToggleFavorite,
  onUpdateWish,
  currency = '€',
  onAddWish,
  onProposeWish,
  onContribute,
  onContributeError,
  onContributeRemoved,
  pot = null,
  onPotRefreshed,
  userId = '',
  isLoggedIn = false,
  isInvited = false,
  onPotCreated,
  giftPots = {},
  onGiftPotCreated,
  onContributeGiftPot,
  onContributeGiftPotError,
  onGiftPotRemoved,
  onGiftPotRefreshed,
  eventName,
  userIsOwner = false,
  isHistory = false,
  hasActivity = false,
  onUpdateWishlistMeta,
  onDeleteWishlist,
  onDeleteWishlistError,
}: TWishlistPageProps) {
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'date'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<('all' | 'wanted' | 'purchased' | 'reserved' | 'proposed' | 'funded')[]>(['all'])
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({min: null, max: null})
  const [isControlsOpen, setIsControlsOpen] = useState(false)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isProposeItemModalOpen, setIsProposeItemModalOpen] = useState(false)
  const [isEditWishModalOpen, setIsEditWishModalOpen] = useState(false)
  const [editingWish, setEditingWish] = useState<TWishCard | null>(null)
  const [loginPrompt, setLoginPrompt] = useState<'suggest' | 'contribute' | 'reserve' | null>(null)

  const t = useTranslations('wishlist')
  const tComments = useTranslations('comments')
  const locale = useLocale()

  // The gift-pot UI labels the pot with the event it belongs to; fall back to the
  // wishlist name when the page did not pass an explicit event name.
  const wishEventName = eventName ?? name

  // Owned wishlists can always be edited while active; once in history,
  // editing/deleting is only safe if no one has interacted with it yet
  // (no reservations/purchases/suggestions, no pot, no comments).
  const canEditWishlist = userIsOwner && (!isHistory || !hasActivity)
  const canDeleteWishlist = userIsOwner && isHistory && !hasActivity
  const showLockedNotice = userIsOwner && isHistory && hasActivity

  // An empty bound means "no limit", so a wish above any fixed ceiling is never hidden by default.
  const isOutsidePriceRange = useCallback(
    (price: number) =>
      (priceRange.min !== null && price < priceRange.min) || (priceRange.max !== null && price > priceRange.max),
    [priceRange],
  )

  const compareItems = useCallback((a: TWishCard, b: TWishCard) => {
    let comparison = 0
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'price':
        comparison = a.price - b.price
        break
      case 'date':
        comparison = addedAt(a) - addedAt(b)
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  }, [sortBy, sortOrder])

  const filteredAndSortedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      // Proposed items are always shown in their own section, never in the main grid
      if (item.status === 'proposed' || item.isProposed) return false

      // A funded wish is still open to buy, so the "wanted" filter must let it through.
      const matchesStatus =
        statusFilter.includes('all') ||
        statusFilter.includes(item.status) ||
        (item.status === 'funded' && statusFilter.includes('wanted'))

      if (!matchesStatus) {
        return false
      }

      if (isOutsidePriceRange(item.price)) {
        return false
      }

      return true
    })

    filtered.sort(compareItems)

    return filtered
  }, [items, compareItems, statusFilter, isOutsidePriceRange])

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
  // Funded wishes still count as wanted — the pot is full but nobody has bought the gift yet.
  const wantedItems = items.filter((item) => item.status === 'wanted' || item.status === 'funded')
  const reservedItems = items.filter((item) => item.status === 'reserved')
  // Guests pick one view: everything, what is still open to give, or what is already taken.
  const isAllFilter = statusFilter.includes('all')
  const isOpenFilter = statusFilter.length === 1 && statusFilter[0] === 'wanted'
  const isTakenFilter = statusFilter.includes('reserved') && statusFilter.includes('purchased')
  const allProposedItems = items.filter((item) => item.isProposed || item.status === 'proposed')
  const proposedItems = useMemo(() => {
    const filtered = allProposedItems.filter((item) => !isOutsidePriceRange(item.price))
    filtered.sort(compareItems)
    return filtered
  }, [allProposedItems, compareItems, isOutsidePriceRange])

  // Suggestions a guest explicitly chose to share with the owner.
  const ownerVisibleSuggestions = useMemo(
    () => allProposedItems.filter((item) => item.showToOwner),
    [allProposedItems],
  )

  const handleAddWish = (wish: TWishFormData & { id: string }) => {
    // Call parent callback to update state
    if (onAddWish) {
      onAddWish(wish)
    }
    setIsAddItemModalOpen(false)
  }

  const requireAuth = (promptKey: 'suggest' | 'contribute' | 'reserve', action: () => void) => () => {
    if (!isLoggedIn) {
      setLoginPrompt(promptKey)
      return
    }
    action()
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

  const handleSendShareEmail = async (email: string) => shareWishlist(id, email, locale)

  const resetFilters = () => {
    setSortBy('date')
    setSortOrder('desc')
    setStatusFilter(['all'])
    setPriceRange({min: null, max: null})
  }

  const potCard = !userIsOwner && !isHistory ? (
    <PotCard
          wishlistId={id}
          eventName={name}
          ownerName={ownerName}
          currency={currency}
          isLoggedIn={isLoggedIn}
          isInvited={isInvited}
          pot={pot}
          onContribute={onContribute}
          onContributeError={onContributeError}
          onContributeRemoved={onContributeRemoved}
          onPotCreated={onPotCreated}
          onPotRefreshed={onPotRefreshed}
          onRequireLogin={() => setLoginPrompt('contribute')}
        />
  ) : null

  return (
    <div className={styles.wishlist}>
      <div className={styles.wishlist__layout}>
        <header className={styles.wishlist__intro}>
          <h1 className={styles.wishlist__title}>{name}</h1>
          {(ownerName || eventDate) && (
            <p className={styles.wishlist__byline}>
              {ownerName && (
                <>
                  {t('ownedByPrefix')}{' '}
                  {ownerProfileUrl ? (
                    <a href={ownerProfileUrl} className={styles.wishlist__ownerLink} target="_blank" rel="noopener noreferrer">
                      {ownerName}
                    </a>
                  ) : (
                    ownerName
                  )}
                </>
              )}
              {ownerName && eventDate && ' · '}
              {eventDate && t('eventOn', {date: formatDate(eventDate, locale)})}
            </p>
          )}
          {description && <p className={styles.wishlist__description}>{description}</p>}
          {!userIsOwner && items.length > 0 && (
            <p className={styles.wishlist__lead}>
              <strong>{t('leadAvailable', {count: wantedItems.length})}</strong>{' '}
              {t('leadSurprise', {ownerName})}
            </p>
          )}
          {userIsOwner && (
            <div className={styles.wishlist__badges}>
              <span
                className={`${styles.wishlist__badge} ${isPublic ? styles['wishlist__badge--public'] : styles['wishlist__badge--private']}`}
              >
                {isPublic ? t('public') : t('private')}
              </span>
              <span className={styles.wishlist__badge}>{t('items', {count: items.length})}</span>
            </div>
          )}

          <div className={styles.wishlist__actions}>
            {userIsOwner && !isHistory && (
              <button className={`${styles.wishlist__button} ${styles['wishlist__button--primary']}`}
                      onClick={() => setIsAddItemModalOpen(true)}>
                {t('addItem')}
              </button>
            )}
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
                    coverImage,
                  })
                }}
              >
                {t('editWishlist')}
              </button>
            )}
            <button
              className={`${styles.wishlist__button} ${styles['wishlist__button--secondary']}`}
              onClick={() => setIsShareModalOpen(true)}
            >
              {t('share')}
            </button>
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
          </div>
          {showLockedNotice && (
            <p className={styles.wishlist__lockedNotice}>{t('cannotEditNotice')}</p>
          )}
        </header>

        <div className={styles.wishlist__main}>
      {items.length === 0 ? (
<>
        <div className={styles.wishlist__empty}>
          <div className={styles.wishlist__emptyIllustration} aria-hidden="true">
            <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Gift box body */}
              <rect x="28" y="76" width="104" height="52" rx="5" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5"/>
              {/* Gift box lid */}
              <rect x="22" y="60" width="116" height="22" rx="5" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5"/>
              {/* Vertical ribbon */}
              <rect x="70" y="60" width="20" height="68" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1"/>
              {/* Bow — left loop */}
              <path d="M80 60 C62 38 36 42 40 58 C44 72 72 65 80 60Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.2" opacity="0.7"/>
              {/* Bow — right loop */}
              <path d="M80 60 C98 38 124 42 120 58 C116 72 88 65 80 60Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.2" opacity="0.7"/>
              {/* Bow center */}
              <ellipse cx="80" cy="60" rx="7" ry="5" fill="currentColor" opacity="0.35"/>
              {/* Left botanical sprig */}
              <path d="M28 90 Q14 80 18 68 Q24 75 28 90Z" fill="currentColor" opacity="0.25"/>
              <path d="M28 104 Q10 96 14 82 Q22 88 28 104Z" fill="currentColor" opacity="0.18"/>
              <line x1="28" y1="68" x2="28" y2="112" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
              {/* Right botanical sprig */}
              <path d="M132 90 Q146 80 142 68 Q136 75 132 90Z" fill="currentColor" opacity="0.25"/>
              <path d="M132 104 Q150 96 146 82 Q138 88 132 104Z" fill="currentColor" opacity="0.18"/>
              <line x1="132" y1="68" x2="132" y2="112" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
              {/* Small decorative dots */}
              <circle cx="80" cy="22" r="3" fill="currentColor" opacity="0.25"/>
              <circle cx="66" cy="28" r="2" fill="currentColor" opacity="0.2"/>
              <circle cx="94" cy="28" r="2" fill="currentColor" opacity="0.2"/>
            </svg>
          </div>
          <h3 className={styles.wishlist__emptyTitle}>{t('emptyTitle')}</h3>
          <p className={styles.wishlist__emptyMessage}>
            {userIsOwner ? t('emptyMessage') : t('emptyMessageVisitor')}
          </p>
          {userIsOwner && (
            <button className={styles.wishlist__emptyButton} onClick={() => setIsAddItemModalOpen(true)}>
              {t('emptyButton')}
            </button>
          )}
          {!userIsOwner && !isHistory && (
            <button
              className={styles.wishlist__emptyButton}
              onClick={requireAuth('suggest', () => setIsProposeItemModalOpen(true))}
            >
              {t('suggestWish')}
            </button>
          )}
            </div>
            {potCard}
          </>
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
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'date')}
                >
                  <option value="date">{t('sortDateAdded')}</option>
                  <option value="name">{t('sortName')}</option>
                  <option value="price">{t('sortPrice')}</option>
                </select>
                <button
                  className={`${styles.wishlist__sortButton} ${sortOrder === 'asc' ? styles['wishlist__sortButton--active'] : ''}`}
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  aria-label={sortOrder === 'asc' ? t('sortAscending') : t('sortDescending')}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                       style={{transform: sortOrder === 'asc' ? 'rotate(180deg)' : undefined}}>
                    <path d="M7 2.5v9M3.5 8L7 11.5 10.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {!userIsOwner && (
              <div className={styles.wishlist__controlsSection}>
                <h4 className={styles.wishlist__controlsTitle}>{t('filterByStatus')}</h4>
                <div className={styles.wishlist__filterButtons}>
                  <button
                    className={`${styles.wishlist__filterButton} ${isAllFilter ? styles['wishlist__filterButton--active'] : ''}`}
                    aria-pressed={isAllFilter}
                    onClick={() => setStatusFilter(['all'])}
                  >
                    {t('filterAll', {count: items.filter(i => i.status !== 'proposed').length})}
                  </button>
                  <button
                    className={`${styles.wishlist__filterButton} ${isOpenFilter ? styles['wishlist__filterButton--active'] : ''}`}
                    aria-pressed={isOpenFilter}
                    onClick={() => setStatusFilter(['wanted'])}
                  >
                    {t('filterOpenToBuy', {count: wantedItems.length})}
                  </button>
                  <button
                    className={`${styles.wishlist__filterButton} ${isTakenFilter ? styles['wishlist__filterButton--active'] : ''}`}
                    aria-pressed={isTakenFilter}
                    onClick={() => setStatusFilter(['reserved', 'purchased'])}
                  >
                    {t('filterTaken', {count: reservedItems.length + purchasedItems.length})}
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
                    aria-label={t('priceMinLabel')}
                    placeholder={t('priceMinPlaceholder')}
                    value={priceRange.min ?? ''}
                    onChange={(e) => setPriceRange((prev) => ({...prev, min: e.target.value === '' ? null : Number(e.target.value)}))}
                  />
                  <span className={styles.wishlist__priceSeparator}>-</span>
                  <input
                    type="number"
                    className={styles.wishlist__priceInput}
                    aria-label={t('priceMaxLabel')}
                    placeholder={t('priceMaxPlaceholder')}
                    value={priceRange.max ?? ''}
                    onChange={(e) => setPriceRange((prev) => ({...prev, max: e.target.value === '' ? null : Number(e.target.value)}))}
                  />
                </div>
                <button
                  className={styles.wishlist__resetButton}
                  onClick={() => setPriceRange({min: null, max: null})}
                >
                  {t('resetButton')}
                </button>
              </div>
            </div>
            </div>{/* wishlist__controlsBodyInner */}
            </div>{/* wishlist__controlsBody */}
          </div>

          {filteredAndSortedItems.length !== items.filter(i => i.status !== 'proposed').length && (
            <p className={styles.wishlist__resultsCount} aria-live="polite">
              {t('resultsCount', {shown: filteredAndSortedItems.length, total: items.filter(i => i.status !== 'proposed').length})}
            </p>
          )}

          {mostWantedItems.length > 0 && (
            <div className={styles.wishlist__mostWantedSection}>
              <div className={styles.wishlist__mostWantedPanel}>
              <div className={styles.wishlist__mostWantedHeaderWrap}>
                <h2 className={styles.wishlist__mostWantedTitle}>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 13.6S1.8 9.9 1.8 5.7A3.2 3.2 0 0 1 8 4.3a3.2 3.2 0 0 1 6.2 1.4C14.2 9.9 8 13.6 8 13.6z"/>
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
                    commentCount={item.commentCount}
                    reservedBy={item.reservedBy}
                    purchasedBy={item.purchasedBy}
                    reservedByName={item.reservedByName}
                    purchasedByName={item.purchasedByName}
                    showOwnerAction={!isHistory && !!userIsOwner}
                    isOwner={userIsOwner}
                    isHistory={isHistory}
                    showGuestAction={!isHistory && !userIsOwner}
                    onRequireLogin={() => setLoginPrompt('reserve')}
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
                    onToggleFavorite={onToggleFavorite}
                    giftPot={giftPots[item.id]}
                    onGiftPotCreated={onGiftPotCreated}
                    onContributeGiftPot={onContributeGiftPot}
                    onContributeGiftPotError={onContributeGiftPotError}
                    onGiftPotRemoved={onGiftPotRemoved}
                    onGiftPotRefreshed={onGiftPotRefreshed}
                    isLoggedIn={isLoggedIn}
                    isInvited={isInvited}
                    ownerName={ownerName}
                    eventName={wishEventName}
                    userId={userId}
                  />
                ))}
              </div>
              </div>
            </div>
          )}

          {mostWantedItems.length > 0 && regularItems.length > 0 && (
            <h2 className={styles.wishlist__allTitle}>{t('allIdeas')}</h2>
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
                commentCount={item.commentCount}
                reservedBy={item.reservedBy}
                purchasedBy={item.purchasedBy}
                reservedByName={item.reservedByName}
                purchasedByName={item.purchasedByName}
                showOwnerAction={!isHistory && !!userIsOwner}
                isOwner={userIsOwner}
                isHistory={isHistory}
                showGuestAction={!isHistory && !userIsOwner}
                    onRequireLogin={() => setLoginPrompt('reserve')}
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
                onToggleFavorite={onToggleFavorite}
                giftPot={giftPots[item.id]}
                onGiftPotCreated={onGiftPotCreated}
                onContributeGiftPot={onContributeGiftPot}
                onContributeGiftPotError={onContributeGiftPotError}
                onGiftPotRemoved={onGiftPotRemoved}
                onGiftPotRefreshed={onGiftPotRefreshed}
                isLoggedIn={isLoggedIn}
                isInvited={isInvited}
                ownerName={ownerName}
                eventName={wishEventName}
                userId={userId}
              />
            ))}
          </div>

          {mostWantedItems.length === 0 && regularItems.length === 0 && items.filter(i => i.status !== 'proposed').length > 0 && (
            <div className={styles.wishlist__noResults}>
              <div className={styles.wishlist__noResultsIcon} aria-hidden="true">🔍</div>
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

          {potCard}

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
                  {isLoggedIn && (
                    <p className={styles.wishlist__suggestionsMeta}>
                      {allProposedItems.length === 0
                        ? t('suggestionsEmptyMeta')
                        : proposedItems.length < allProposedItems.length
                          ? t('suggestionsPartialMeta', {shown: proposedItems.length, total: allProposedItems.length})
                          : t('suggestionsAllMeta', {count: proposedItems.length})}
                    </p>
                  )}
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
                  className={`${styles.wishlist__button} ${styles['wishlist__button--secondary']}`}
                  onClick={requireAuth('suggest', () => setIsProposeItemModalOpen(true))}
                >
                  {t('suggestWish')}
                </button>
              </div>

              {!isLoggedIn ? null : proposedItems.length > 0 ? (
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
                      commentCount={item.commentCount}
                      reservedBy={item.reservedBy}
                      purchasedBy={item.purchasedBy}
                      reservedByName={item.reservedByName}
                      purchasedByName={item.purchasedByName}
                      showOwnerAction={false}
                      isOwner={userIsOwner}
                      showGuestAction={!userIsOwner}
                      onRequireLogin={() => setLoginPrompt('reserve')}
                      onReserve={onReserveWish}
                      onReserveError={onReserveError}
                      onCancelReservation={onCancelReservation}
                      onCancelError={onCancelError}
                      onMarkPurchased={onMarkPurchasedWish}
                      onMarkPurchasedError={onMarkPurchasedError}
                      // Proposed wishes never carry a gift pot — undefined hides the section entirely.
                      giftPot={undefined}
                      isLoggedIn={isLoggedIn}
                      isInvited={isInvited}
                      ownerName={ownerName}
                      eventName={wishEventName}
                      userId={userId}
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

          {/* ── Suggestions shared with the owner (owner only, not in history) ── */}
          {userIsOwner && !isHistory && (
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
                    {ownerVisibleSuggestions.length === 0
                      ? t('suggestionsOwnerEmpty')
                      : t('suggestionsOwnerMeta', {count: ownerVisibleSuggestions.length})}
                  </p>
                </div>
              </div>

              {ownerVisibleSuggestions.length > 0 ? (
                <div className={styles.wishlist__itemsGrid}>
                  {ownerVisibleSuggestions.map((item) => (
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
                      showOwnerAction={false}
                      showGuestAction={false}
                      isOwner
                      // Proposed wishes never carry a gift pot — undefined hides the section entirely.
                      giftPot={undefined}
                      isLoggedIn={isLoggedIn}
                      isInvited={isInvited}
                      ownerName={ownerName}
                      eventName={wishEventName}
                      userId={userId}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.wishlist__suggestionsEmpty}>
                  <p>{t('suggestionsOwnerEmpty')}</p>
                </div>
              )}
            </div>
          )}

          {!userIsOwner && !isHistory && (
            <div className={styles.wishlist__commentsSection}>
              <CommentsSection
                target={{ type: 'wishlist', wishlistId: id }}
                enabled={!userIsOwner}
                isLoggedIn={isLoggedIn}
                emptyMessage={tComments('wishlistEmpty', { ownerName })}
              />
            </div>
          )}
        </div>
      )}
        </div>
      </div>

      {!userIsOwner && <CommentsDrawer isLoggedIn={isLoggedIn} />}

      {canEditWishlist && (
        <UpdateWishlistModal
          onSubmit={handleUpdateWishlist}
          initialData={{
            name,
            description,
            eventDate: eventDate ? new Date(eventDate).toISOString().slice(0, 10) : '',
            isPublic,
            coverImage,
            allowSuggestions,
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
            />
          )}
        </>
      )}

      <LoginPromptModal
        isOpen={loginPrompt !== null}
        onClose={() => setLoginPrompt(null)}
        message={
          loginPrompt === 'contribute'
            ? t('loginToContribute', {ownerName})
            : loginPrompt === 'reserve'
              ? t('loginToReserve', {ownerName})
              : t('loginToSuggest', {name, ownerName})
        }
      />

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
