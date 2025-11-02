import Image from 'next/image'

import {TWishlistCard} from '@/widgets/WishlistCard';

import {mockUserPrivate} from '@/entities/user';

import {Button} from '@/shared/ui';

import styles from './WishlistCard.module.css'
import {eventBus} from '@/shared/eventBus';

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
};

export const WishlistCard = ({
  id,
  name,
  description,
  coverImage,
  createdAt,
  isPublic,
  itemCount = 0,
  ownerId,
  ownerName
}: TWishlistCard) => {
  const user = mockUserPrivate
  const isOwnedByCurrentUser = user.id === ownerId;

  return (
    <div className={styles.wishlistCard}>
      <div className={styles.wishlistCard__imageContainer}>
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
            target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Image transparente 1x1
          }}
        />
        <div
          className={`${styles.wishlistCard__badge} ${isPublic ? styles['wishlistCard__badge--public'] : styles['wishlistCard__badge--private']}`}
        >
          {isPublic ? 'Public' : 'Private'}
        </div>
      </div>

      <div className={styles.wishlistCard__content}>
        <div className={styles.wishlistCard__header}>
          <h3 className={styles.wishlistCard__title}>{name}</h3>
          <span className={styles.wishlistCard__count}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        <p className={styles.wishlistCard__description}>{description}</p>

        <div className={styles.wishlistCard__footer}>
          <span className={styles.wishlistCard__date}>Created {getRelativeTime(createdAt)}</span>
          {!isOwnedByCurrentUser && (
            <span className={styles.wishlistCard__owner}>By {ownerName}</span>
          )}
          <div className={styles.wishlistCard__actions}>
            {isOwnedByCurrentUser && (
              <button
                className={`${styles.wishlistCard__button} ${styles['wishlistCard__button--secondary']}`}
                onClick={() => {
                  eventBus.emit('wishlist:openUpdateModal', {
                    id,
                    name,
                    description,
                    coverImage,
                    createdAt,
                    isPublic,
                    itemCount,
                    ownerId,
                    ownerName
                  })
                }}
              >
                Edit
              </button>
            )}
            <Button href={`/wishlist/${id}`} variant={'primary'} className={`${styles.wishlistCard__button}`}>
              View
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
