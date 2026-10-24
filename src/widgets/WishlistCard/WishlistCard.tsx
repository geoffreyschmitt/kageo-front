import Image from 'next/image'

import {useTranslations, useFormatter} from 'next-intl'

import {TWishlistCard} from '@/widgets/WishlistCard';

import {eventBus} from '@/shared/eventBus';
import {Link} from '@/shared/i18n/navigation';

import styles from './WishlistCard.module.css'

const getDaysUntil = (date: Date): number => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export const WishlistCard = ({
    id,
    name,
    description,
    coverImage,
    previewImages,
    eventDate,
    createdAt,
    isPublic,
    itemCount = 0,
    ownerId,
    ownerName,
    isPending = false,
    isHistory = false,
    isOwnedByCurrentUser = false,
    hideOwner = false,
}: TWishlistCard) => {
    const t = useTranslations('wishlistCard')
    const format = useFormatter()

    const displayPreviews = previewImages?.filter(Boolean).slice(0, 4) ?? []
    const usePreviewGrid = displayPreviews.length >= 2

    const formattedDate = format.dateTime(eventDate, { day: 'numeric', month: 'long', year: 'numeric' })

    const days = getDaysUntil(eventDate)
    const months = Math.round(days / 30)
    const countdown =
        days === 0 ? t('today')
        : days === 1 ? t('tomorrow')
        : days > 1 && days <= 60 ? t('inDays', {count: days})
        : days > 60 ? t('inMonths', {count: months})
        : days >= -60 ? t('daysAgo', {count: -days})
        : t('monthsAgo', {count: -months})
    const countdownTone = days < 0 ? 'past' : days <= 1 ? 'soon' : 'default'

    return (
        <div className={styles.wishlistCard} aria-busy={isPending || undefined}>
            <span className={`${styles.wishlistCard__tab} ${styles[`wishlistCard__tab--${countdownTone}`]}`}>
                {countdown}
            </span>
            <div className={styles.wishlistCard__body}>
            <div className={styles.wishlistCard__imageContainer}>
                {usePreviewGrid ? (
                    <div className={styles.wishlistCard__previewGrid}>
                        {([0, 1, 2, 3] as const).map(i =>
                            displayPreviews[i] ? (
                                <div key={i} className={styles.wishlistCard__previewCell}>
                                    <Image
                                        src={displayPreviews[i]}
                                        alt=""
                                        fill
                                        sizes="150px"
                                        className={styles.wishlistCard__previewImage}
                                    />
                                </div>
                            ) : (
                                <div key={i} className={`${styles.wishlistCard__previewCell} ${styles['wishlistCard__previewCell--empty']}`} />
                            )
                        )}
                    </div>
                ) : (
                    <Image
                        src={coverImage || '/placeholder.svg'}
                        alt=""
                        width={300}
                        height={200}
                        className={styles.wishlistCard__image}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4="
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.backgroundColor = 'var(--surface-sunken-2)';
                            target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                        }}
                    />
                )}
                {isOwnedByCurrentUser && (
                    <div
                        className={`${styles.wishlistCard__badge} ${isPublic ? styles['wishlistCard__badge--public'] : styles['wishlistCard__badge--private']}`}
                    >
                        {isPublic ? t('public') : t('private')}
                    </div>
                )}
                <span className={styles.wishlistCard__countOverlay}>
                    {t('items', {count: itemCount})}
                </span>
            </div>

            <div className={styles.wishlistCard__content}>
                <div className={styles.wishlistCard__header}>
                    <h3 className={styles.wishlistCard__title}>
                        {isPending ? name : (
                            <Link
                                href={`/wishlist/${id}${isHistory ? '?mode=history' : ''}`}
                                className={styles.wishlistCard__link}
                            >
                                {name}
                            </Link>
                        )}
                    </h3>
                </div>

                {!isOwnedByCurrentUser && !hideOwner && (
                    <p className={styles.wishlistCard__owner}>{t('by', {name: ownerName})}</p>
                )}

                {description && <p className={styles.wishlistCard__description}>{description}</p>}

                <div className={styles.wishlistCard__footer}>
                    <span className={styles.wishlistCard__date}>{formattedDate}</span>
                    <div className={styles.wishlistCard__actions}>
                        {isOwnedByCurrentUser && !isHistory && (
                            <button
                                className={`${styles.wishlistCard__button} ${styles['wishlistCard__button--secondary']}`}
                                onClick={() => {
                                    eventBus.emit('wishlist:openUpdateModal', {
                                        id,
                                        name,
                                        description,
                                        coverImage,
                                        eventDate,
                                        createdAt,
                                        isPublic,
                                        itemCount,
                                        ownerId,
                                        ownerName
                                    })
                                }}
                            >
                                {t('edit')}
                            </button>
                        )}
                        {isPending && <span className={styles.wishlistCard__saving}>{t('saving')}</span>}
                    </div>
                </div>
            </div>
            </div>
        </div>
    )
}
