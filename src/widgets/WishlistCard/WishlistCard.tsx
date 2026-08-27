import Image from 'next/image'
import {useTranslations, useFormatter} from 'next-intl'

import {TWishlistCard} from '@/widgets/WishlistCard';

import {Button} from '@/shared/ui';

import styles from './WishlistCard.module.css'
import {eventBus} from '@/shared/eventBus';

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
}: TWishlistCard) => {
    const t = useTranslations('wishlistCard')
    const format = useFormatter()

    const displayPreviews = previewImages?.filter(Boolean).slice(0, 4) ?? []
    const usePreviewGrid = displayPreviews.length >= 2

    const formattedDate = format.dateTime(eventDate, { day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className={styles.wishlistCard}>
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
                        alt={`${name} wishlist cover`}
                        width={300}
                        height={200}
                        className={styles.wishlistCard__image}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UyZTJlMiIvPjwvc3ZnPg=="
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.backgroundColor = '#e2e2e2';
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
                    <h3 className={styles.wishlistCard__title}>{name}</h3>
                </div>

                {description && <p className={styles.wishlistCard__description}>{description}</p>}

                <div className={styles.wishlistCard__footer}>
                    <span className={styles.wishlistCard__date}>{formattedDate}</span>
                    {!isOwnedByCurrentUser && (
                        <span className={styles.wishlistCard__owner}>{t('by', {name: ownerName})}</span>
                    )}
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
                        {isPending ? (
                            <Button
                                variant={'primary'}
                                className={`${styles.wishlistCard__button}`}
                                disabled
                            >
                                {t('view')}
                            </Button>
                        ) : (
                            <Button
                                href={`/wishlist/${id}${isHistory ? '?mode=history' : ''}`}
                                variant={'primary'}
                                className={`${styles.wishlistCard__button}`}
                            >
                                {t('view')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
