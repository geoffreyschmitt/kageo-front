import Image from 'next/image'

import {TWishCard} from '@/widgets/WishCard/WishCard.types';

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
  showOwnerAction = false,
  showGuestAction = false
}: TWishCard) => {
  return (
    <div className={`${styles['wish-card']} ${status === 'purchased' ? styles['wish-card--purchased'] : ''}`}
         data-id={id}>
      <div className={styles['wish-card__imageContainer']}>
        <Image
          src={imageUrl || '/placeholder.svg'}
          alt={name}
          width={200}
          height={200}
          className={styles['wish-card__image']}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UyZTJlMiIvPjwvc3ZnPg=="
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.backgroundColor = '#e2e2e2';
            target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Image transparente 1x1
          }}
        />
        <div className={`${styles['wish-card__priority']} ${getPriorityClass(priority)}`}>{priority}</div>
        <div className={`${styles['wish-card__status']} ${getStatusClass(status)}`}>{status}</div>
      </div>

      <div className={styles['wish-card__content']}>
        <div className={styles['wish-card__header']}>
          <h3 className={styles['wish-card__title']}>{name}</h3>
          <div className={styles['wish-card__price']}>
            {currency}
            {price.toFixed(2)}
          </div>
        </div>

        <p className={styles['wish-card__description']}>{description}</p>

        {notes && (
          <div className={styles['wish-card__notes']}>
            <span className={styles['wish-card__notesLabel']}>Notes:</span>
            <p className={styles['wish-card__notesText']}>{notes}</p>
          </div>
        )}

        <div className={styles['wish-card__meta']}>
          <span className={styles['wish-card__date']}>Added {addedDate}</span>
        </div>

        <div className={styles['wish-card__actions']}>
          {showGuestAction && (
            <>
              {status === 'wanted' && (
                <a
                  className={`${styles['wish-card__button']} ${styles['wish-card__button--reserved']}`}
                >
                  Reserve
                </a>
              )}

              {purchaseUrl && status === 'wanted' && (
                <a
                  href={purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles['wish-card__button']} ${styles['wish-card__button--primary']}`}
                >
                  Buy Now
                </a>
              )}

              {/** TODO for reserved items, should only be able to mark purchased for the user who reserved it */}
              {(status === 'wanted' || status === 'reserved') && (
                <button className={`${styles['wish-card__button']} ${styles['wish-card__button--success']}`}>
                  Mark Purchased
                </button>
              )}
            </>
          )}
          {showOwnerAction && (
            <>
              <button className={`${styles['wish-card__button']} ${styles['wish-card__button--secondary']}`}>Edit
              </button>
              <button className={`${styles['wish-card__button']} ${styles['wish-card__button--danger']}`}>Remove
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
