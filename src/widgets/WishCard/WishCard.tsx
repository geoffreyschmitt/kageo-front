'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import {useTranslations} from 'next-intl'

import {TWishCard} from '@/widgets/WishCard/WishCard.types';

import {ReserveButton} from "@/features/reserveWish";
import {CancelReservationButton} from "@/features/cancelReservation";
import {MarkPurchasedButton} from "@/features/markPurchasedWish";
import {RemovePurchasedButton} from "@/features/removePurchasedWish";
import {DeleteWishButton} from "@/features/DeleteWish";
import {CommentsSection} from "@/features/Comments";

import styles from './WishCard.module.css'

const getPriorityClass = (priority) => {
    switch (priority) {
        case 'high':
            return styles['wish-card__priority--high']
        case 'medium':
            return styles['wish-card__priority--medium']
        case 'low':
            return styles['wish-card__priority--low']
        default:
            return styles['wish-card__priority--medium']
    }
}

const getStatusClass = (status) => {
    switch (status) {
        case 'purchased':
            return styles['wish-card__status--purchased']
        case 'reserved':
            return styles['wish-card__status--reserved']
        case 'proposed':
            return styles['wish-card__status--proposed']
        case 'funded':
            return styles['wish-card__status--funded']
        case 'wanted':
            return styles['wish-card__status--wanted']
        default:
            return styles['wish-card__status--wanted']
    }
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
    reservedBy,
    purchasedBy,
    showOwnerAction = false,
    showGuestAction = false,
    isOwner = false,
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
    useMock
}: TWishCard) => {
    const t = useTranslations('wishCard')
    const tComments = useTranslations('comments')
    const [imgError, setImgError] = useState(false)
    const [descExpanded, setDescExpanded] = useState(false)
    const [descOverflows, setDescOverflows] = useState(false)
    const [commentsOpen, setCommentsOpen] = useState(false)
    const descRef = useRef<HTMLParagraphElement>(null)

    useEffect(() => {
        const el = descRef.current
        if (el) setDescOverflows(el.scrollHeight > el.clientHeight)
    }, [description])

    const visibleStatus =
        showOwnerAction && (status === 'reserved' || status === 'purchased' || status === 'funded')
            ? 'wanted'
            : status

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    const priorityLabel = t(`priority${cap(priority)}`)
    const statusLabel = t(`status${cap(visibleStatus)}`)

    return (
        <div className={`${styles['wish-card']} ${visibleStatus === 'purchased' ? styles['wish-card--purchased'] : ''} ${visibleStatus === 'reserved' ? styles['wish-card--reserved'] : ''} ${priority === 'high' && visibleStatus !== 'purchased' ? styles['wish-card--high-priority'] : ''}`}
             data-id={id}>
            <div className={styles['wish-card__imageContainer']}>
                {imageUrl && !imgError ? (
                    <Image
                        src={imageUrl}
                        alt={name}
                        width={200}
                        height={200}
                        className={styles['wish-card__image']}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YyZWRlNSIvPjwvc3ZnPg=="
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className={styles['wish-card__imagePlaceholder']}>
                        <span className={styles['wish-card__imagePlaceholderInitial']}>
                            {name.charAt(0).toUpperCase()}
                        </span>
                        <svg className={styles['wish-card__imagePlaceholderDecor']} viewBox="0 0 200 200" fill="none" aria-hidden="true">
                            <path d="M100 160 Q80 140 70 110 Q60 80 80 60 Q100 40 120 60 Q140 80 130 110 Q120 140 100 160Z" fill="#3f6845" opacity="0.08"/>
                            <path d="M50 120 Q35 100 45 80 Q55 60 75 70 Q95 80 85 105 Q75 130 50 120Z" fill="#3f6845" opacity="0.06"/>
                            <path d="M150 120 Q165 100 155 80 Q145 60 125 70 Q105 80 115 105 Q125 130 150 120Z" fill="#3f6845" opacity="0.06"/>
                            <circle cx="100" cy="55" r="5" fill="#6e3c0c" opacity="0.1"/>
                            <circle cx="72" cy="68" r="3" fill="#3f6845" opacity="0.1"/>
                            <circle cx="128" cy="68" r="3" fill="#3f6845" opacity="0.1"/>
                        </svg>
                    </div>
                )}
                {!showOwnerAction && <div className={`${styles['wish-card__status']} ${getStatusClass(visibleStatus)}`}>{statusLabel}</div>}
                <div className={`${styles['wish-card__priority']} ${getPriorityClass(priority)}`}>
                    {priority === 'high' && (
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M8 0l2.35 4.76 5.25.77-3.8 3.7.9 5.24L8 12.18l-4.7 2.29.9-5.24-3.8-3.7 5.25-.77z"/>
                        </svg>
                    )}
                    {priorityLabel}
                </div>
            </div>

            <div className={styles['wish-card__content']}>
                <div className={styles['wish-card__header']}>
                    <h3 className={styles['wish-card__title']}>{name}</h3>
                    <div className={styles['wish-card__price']}>
                        {currency}
                        {price.toFixed(2)}
                    </div>
                </div>

                {status === 'reserved' && !showOwnerAction && (
                    <div className={styles['wish-card__reservedBanner']}>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                            <rect x="2" y="5.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                            <path d="M4 5.5V3.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                        <span>{reservedBy === userId ? t('youPlanningToGift') : t('someonePlanningToGift')}</span>
                    </div>
                )}

                {description && (
                    <p
                        ref={descRef}
                        className={`${styles['wish-card__description']} ${descExpanded ? styles['wish-card__description--expanded'] : ''}`}
                    >{description}</p>
                )}
                {description && (descOverflows || descExpanded) && (
                    <button
                        className={styles['wish-card__desc-toggle']}
                        onClick={() => setDescExpanded(v => !v)}
                    >
                        {descExpanded ? t('showLess') : t('showMore')}
                    </button>
                )}

                {notes && (
                    <div className={styles['wish-card__notes']}>
                        <span className={styles['wish-card__notesLabel']}>{t('notes')}</span>
                        <p className={styles['wish-card__notesText']}>{notes}</p>
                    </div>
                )}

                <div className={styles['wish-card__meta']}>
                    <span className={styles['wish-card__date']}>{t('added', {date: addedDate})}</span>
                    {!showOwnerAction && status === 'reserved' && reservedBy && (
                        <span className={styles['wish-card__reservedBy']}>
                            {reservedBy === userId ? t('reservedByYou') : t('reservedBy', {name: reservedBy})}
                        </span>
                    )}
                    {!showOwnerAction && status === 'purchased' && purchasedBy && (
                        <span className={styles['wish-card__purchasedBy']}>{t('purchasedBy', {name: purchasedBy})}</span>
                    )}
                </div>

                {!isOwner && (
                    <button
                        type="button"
                        className={styles['wish-card__commentsToggle']}
                        onClick={() => setCommentsOpen((v) => !v)}
                    >
                        💬 {commentsOpen ? tComments('toggleHide') : tComments('toggleShow')}
                    </button>
                )}
                {!isOwner && commentsOpen && (
                    <div className={styles['wish-card__comments']}>
                        <CommentsSection target={{ type: 'wish', wishId: id }} enabled={commentsOpen} />
                    </div>
                )}

                {(showGuestAction || showOwnerAction) && (
                <div className={styles['wish-card__actions']}>
                    {showGuestAction && (
                        <>
                            {(status === 'wanted' || status === 'proposed') && userId && (
                                <ReserveButton wishId={id} userId={userId} onReserve={onReserve} onError={onReserveError} useMock={useMock}/>
                            )}

                            {status === 'reserved' && reservedBy === userId && (
                                <CancelReservationButton wishId={id} onCancel={onCancelReservation} onError={onCancelError} useMock={useMock}/>
                            )}

                            {purchaseUrl && (status === 'wanted' || status === 'proposed') && (
                                <a
                                    href={purchaseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles['wish-card__button']} ${styles['wish-card__button--primary']}`}
                                >
                                    {t('buyNow')}
                                </a>
                            )}

                            {status === 'reserved' && reservedBy === userId && userId && (
                                <MarkPurchasedButton
                                    wishId={id}
                                    userId={userId}
                                    onMarkPurchased={onMarkPurchased}
                                    onError={onMarkPurchasedError}
                                    useMock={useMock}
                                />
                            )}

                            {status === 'purchased' && purchasedBy === userId && (
                                <RemovePurchasedButton
                                    wishId={id}
                                    onRemovePurchased={onRemovePurchased}
                                    onError={onRemovePurchasedError}
                                    useMock={useMock}
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
                                    useMock
                                })}
                            >
                                {t('edit')}
                            </button>
                            <DeleteWishButton
                                wishId={id}
                                wishName={name}
                                onDelete={onDeleteWish}
                                onError={onDeleteError}
                                useMock={useMock}
                            />
                        </>
                    )}
                </div>
                )}
            </div>
        </div>
    )
}
