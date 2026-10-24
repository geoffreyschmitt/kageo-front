'use client'

import { useState, useEffect, useId, useRef } from 'react'

import Image from 'next/image'

import {useLocale, useTranslations} from 'next-intl'

import {GiftPotSection} from "@/widgets/GiftPotSection";
import {hidesGuestState, resolveVisibleStatus} from '@/widgets/WishCard/visibleStatus';
import {TWishCard} from '@/widgets/WishCard/WishCard.types';


import {CancelReservationButton} from "@/features/cancelReservation";
import {DeleteWishButton} from "@/features/DeleteWish";
import {MarkPurchasedButton} from "@/features/markPurchasedWish";
import {RemovePurchasedButton} from "@/features/removePurchasedWish";
import {ReserveButton} from "@/features/reserveWish";

import {formatVersionPrice} from '@/entities/wish';

import {eventBus} from "@/shared/eventBus";


import styles from './WishCard.module.css'

const STATUS_CLASS = {
    purchased: styles['wish-card__status--purchased'],
    reserved: styles['wish-card__status--reserved'],
    proposed: styles['wish-card__status--proposed'],
    funded: styles['wish-card__status--funded'],
    wanted: styles['wish-card__status--wanted'],
}

export const WishCard = ({
    id,
    name,
    description,
    price,
    currency,
    imageUrl,
    priority,
    status,
    purchaseUrl,
    notes,
    addedDate,
    commentCount,
    reservedBy,
    purchasedBy,
    reservedByName,
    purchasedByName,
    showOwnerAction = false,
    showGuestAction = false,
    isOwner = false,
    isHistory = false,
    onReserve,
    onReserveError,
    onCancelReservation,
    onCancelError,
    onMarkPurchased,
    onMarkPurchasedError,
    onRemovePurchased,
    onRemovePurchasedError,
    onDeleteWish,
    onDeleteError,
    onEditWish,
    onToggleFavorite,
    userId,
    onRequireLogin,
    giftPot,
    onGiftPotCreated,
    onContributeGiftPot,
    onContributeGiftPotError,
    onGiftPotRemoved,
    onGiftPotRefreshed,
    isLoggedIn,
    isInvited,
    eventName,
    ownerName
}: TWishCard) => {
    const t = useTranslations('wishCard')
    const locale = useLocale()
    const tComments = useTranslations('comments')
    const [imgError, setImgError] = useState(false)
    const [descExpanded, setDescExpanded] = useState(false)
    const [descOverflows, setDescOverflows] = useState(false)
    const descRef = useRef<HTMLParagraphElement>(null)
    const descId = useId()

    // Re-measure on resize, font load and locale change: the clamp depends on the rendered width.
    useEffect(() => {
        const el = descRef.current
        if (!el) return
        const measure = () => setDescOverflows(el.scrollHeight > el.clientHeight)
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [description, locale])

    // The owner never sees reservation state on a live list; an archived list reveals it.
    // Decided from isOwner/isHistory so it can't drift from the action flags callers pass.
    const hideGuestState = hidesGuestState({isOwner, isHistory})
    const visibleStatus = resolveVisibleStatus({status, isOwner, isHistory})

    const giftPotActive = giftPot != null
    const noop = () => {}

    // Whether the actions row will actually render a button. Without this the row
    // renders as an empty bordered strip above the gift pot — a double divider.
    const hasGuestActions =
        showGuestAction &&
        ((!giftPotActive && (status === 'wanted' || status === 'proposed') && (!!userId || !!onRequireLogin)) ||
            (status === 'reserved' && reservedBy === userId) ||
            (status === 'purchased' && purchasedBy === userId))
    const hasActionsRow = hasGuestActions || showOwnerAction

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    const statusLabel = t(`status${cap(visibleStatus)}`)
    // Reserve first, then shop: the link only appears for the person who reserved, so two
    // cousins can't both buy the same gift.
    const showPurchaseLink = !!purchaseUrl && !!userId && status === 'reserved' && reservedBy === userId

    return (
        <div className={`${styles['wish-card']} ${visibleStatus === 'purchased' ? styles['wish-card--purchased'] : ''}`}
             data-id={id}>
            <div className={styles['wish-card__imageContainer']}>
                {imageUrl && !imgError ? (
                    <Image
                        src={imageUrl}
                        alt=""
                        width={640}
                        height={520}
                        sizes="(max-width: 768px) 100vw, 420px"
                        className={styles['wish-card__image']}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className={styles['wish-card__imagePlaceholder']} aria-hidden="true">
                        <span className={styles['wish-card__imagePlaceholderInitial']}>
                            {name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                {showOwnerAction && onToggleFavorite && (
                    <button
                        type="button"
                        className={`${styles['wish-card__favorite']} ${priority === 'high' ? styles['wish-card__favorite--on'] : ''}`}
                        aria-pressed={priority === 'high'}
                        aria-label={priority === 'high' ? t('favoriteRemove', {name}) : t('favoriteAdd', {name})}
                        onClick={() => onToggleFavorite(id, priority !== 'high')}
                    >
                        <svg width="20" height="20" viewBox="0 0 16 16" fill={priority === 'high' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
                            <path d="M8 13.6S1.8 9.9 1.8 5.7A3.2 3.2 0 0 1 8 4.3a3.2 3.2 0 0 1 6.2 1.4C14.2 9.9 8 13.6 8 13.6z"/>
                        </svg>
                    </button>
                )}
                {!showOwnerAction && priority === 'high' && (
                    <div className={styles['wish-card__badge']}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M8 13.6S1.8 9.9 1.8 5.7A3.2 3.2 0 0 1 8 4.3a3.2 3.2 0 0 1 6.2 1.4C14.2 9.9 8 13.6 8 13.6z"/>
                        </svg>
                        {t('priorityHighBadge')}
                    </div>
                )}
                {/* "Available" is the default, so only a state that differs gets a chip. */}
                {!showOwnerAction && visibleStatus !== 'wanted' && <div className={`${styles['wish-card__status']} ${STATUS_CLASS[visibleStatus] ?? STATUS_CLASS.wanted}`}>{statusLabel}</div>}
            </div>

            <div className={styles['wish-card__content']}>
                <div className={styles['wish-card__header']}>
                    <h3 className={styles['wish-card__title']}>{name}</h3>
                    {price > 0 && (
                        <div className={styles['wish-card__price']}>
                            {formatVersionPrice(price, currency, locale)}
                        </div>
                    )}
                </div>

                {description && (
                    <p
                        ref={descRef}
                        id={descId}
                        className={`${styles['wish-card__description']} ${descExpanded ? styles['wish-card__description--expanded'] : ''}`}
                    >{description}</p>
                )}
                {description && (descOverflows || descExpanded) && (
                    <button
                        type="button"
                        className={styles['wish-card__desc-toggle']}
                        aria-expanded={descExpanded}
                        aria-controls={descId}
                        onClick={() => setDescExpanded(v => !v)}
                    >
                        {descExpanded ? t('showLess') : t('showMore')}
                    </button>
                )}

                {!hideGuestState && status === 'reserved' && (
                    <p className={`${styles['wish-card__stateLine']} ${styles['wish-card__stateLine--reserved']}`}>
                        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                            <rect x="2" y="5.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                            <path d="M4 5.5V3.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                        {reservedBy === userId
                            ? t('reservedByYou')
                            : t('reservedBy', {name: reservedByName ?? t('someone')})}
                    </p>
                )}
                {!hideGuestState && status === 'purchased' && purchasedBy && (
                    <p className={`${styles['wish-card__stateLine']} ${styles['wish-card__stateLine--purchased']}`}>
                        {purchasedBy === userId
                            ? t('purchasedByYou')
                            : t('purchasedBy', {name: purchasedByName ?? t('someone')})}
                    </p>
                )}

                {notes && (
                    <div className={styles['wish-card__notes']}>
                        <span className={styles['wish-card__notesLabel']}>{t('notes')}</span>
                        <p className={styles['wish-card__notesText']}>{notes}</p>
                    </div>
                )}

                {isOwner && (
                    <div className={styles['wish-card__meta']}>
                        <span className={styles['wish-card__date']}>{t('added', {date: addedDate})}</span>
                        {showOwnerAction && priority === 'high' && (
                            <span className={styles['wish-card__priority']}>
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                    <path d="M8 13.6S1.8 9.9 1.8 5.7A3.2 3.2 0 0 1 8 4.3a3.2 3.2 0 0 1 6.2 1.4C14.2 9.9 8 13.6 8 13.6z"/>
                                </svg>
                                {t('priorityHighBadge')}
                            </span>
                        )}
                    </div>
                )}

                {hasActionsRow && (
                <div className={`${styles['wish-card__actions']} ${showGuestAction ? styles['wish-card__actions--guest'] : ''}`}>
                    {showGuestAction && (
                        <>
                            {!giftPotActive && (status === 'wanted' || status === 'proposed') && userId && (
                                <ReserveButton wishId={id} userId={userId} onReserve={onReserve} onError={onReserveError}/>
                            )}

                            {!giftPotActive && (status === 'wanted' || status === 'proposed') && !userId && onRequireLogin && (
                                <ReserveButton wishId={id} userId="" onRequireLogin={onRequireLogin}/>
                            )}

                            {status === 'reserved' && reservedBy === userId && (
                                <CancelReservationButton wishId={id} onCancel={onCancelReservation} onError={onCancelError}/>
                            )}

                            {showPurchaseLink && (
                                <a
                                    href={purchaseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles['wish-card__button']} ${styles['wish-card__button--ghost']}`}
                                >
                                    {t('viewInShop')}
                                </a>
                            )}

                            {status === 'reserved' && reservedBy === userId && userId && (
                                <MarkPurchasedButton
                                    wishId={id}
                                    userId={userId}
                                    onMarkPurchased={onMarkPurchased}
                                    onError={onMarkPurchasedError}
                                />
                            )}

                            {status === 'purchased' && purchasedBy === userId && (
                                <RemovePurchasedButton
                                    wishId={id}
                                    onRemovePurchased={onRemovePurchased}
                                    onError={onRemovePurchasedError}
                                />
                            )}
                        </>
                    )}
                    {showOwnerAction && (
                        <>
                            <button
                                className={`${styles['wish-card__button']} ${styles['wish-card__button--secondary']}`}
                                onClick={() => onEditWish?.({
                                    id,
                                    name,
                                    description,
                                    price,
                                    currency,
                                    imageUrl,
                                    priority,
                                    status,
                                    purchaseUrl,
                                    notes,
                                    addedDate,
                                    reservedBy,
                                    purchasedBy,
                                    showOwnerAction,
                                    showGuestAction,
                                    onReserve,
                                    onReserveError,
                                    onCancelReservation,
                                    onCancelError,
                                    onMarkPurchased,
                                    onMarkPurchasedError,
                                    onRemovePurchased,
                                    onRemovePurchasedError,
                                    onDeleteWish,
                                    onDeleteError,
                                    onEditWish,
                                    userId,
                                })}
                            >
                                {t('edit')}
                            </button>
                            <DeleteWishButton
                                wishId={id}
                                wishName={name}
                                onDelete={onDeleteWish}
                                onError={onDeleteError}
                            />
                        </>
                    )}
                </div>
                )}

                {/* An archived wishlist is read-only — same rule as the wishlist-level PotCard. */}
                {!isOwner && !isHistory && giftPot !== undefined && (
                    <GiftPotSection
                        wishId={id}
                        attached={hasActionsRow}
                        price={price}
                        currency={currency}
                        status={status}
                        eventName={eventName ?? ''}
                        ownerName={ownerName ?? ''}
                        isLoggedIn={!!isLoggedIn}
                        isInvited={!!isInvited}
                        userId={userId}
                        giftPot={giftPot}
                        onGiftPotCreated={onGiftPotCreated ?? noop}
                        onContributeGiftPot={onContributeGiftPot ?? noop}
                        onContributeGiftPotError={onContributeGiftPotError ?? noop}
                        onGiftPotRemoved={onGiftPotRemoved ?? noop}
                        onGiftPotRefreshed={onGiftPotRefreshed ?? noop}
                        onMarkPurchased={onMarkPurchased}
                        onMarkPurchasedError={onMarkPurchasedError}
                    />
                )}

                {!isOwner && (
                    <div className={styles['wish-card__footer']}>
                        <button
                            type="button"
                            className={styles['wish-card__commentsLink']}
                            onClick={() => eventBus.emit('wish:openComments', { wishId: id, wishName: name })}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z"/>
                            </svg>
                            {commentCount && commentCount > 0
                                ? tComments('count', {count: commentCount})
                                : tComments('addCta')}
                        </button>
                        <span className={styles['wish-card__date']}>{t('added', {date: addedDate})}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
