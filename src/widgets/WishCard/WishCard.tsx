import Image from 'next/image'

import {TWishCard} from '@/widgets/WishCard/WishCard.types';

import {ReserveButton} from "@/features/reserveWish";
import {CancelReservationButton} from "@/features/cancelReservation";
import {MarkPurchasedButton} from "@/features/markPurchasedWish";
import {RemovePurchasedButton} from "@/features/removePurchasedWish";
import {DeleteWishButton} from "@/features/DeleteWish";

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
    reservedBy,
    purchasedBy,
    showOwnerAction = false,
    showGuestAction = false,
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
                    {status === 'reserved' && reservedBy && (
                        <span className={styles['wish-card__reservedBy']}>Reserved by {reservedBy}</span>
                    )}
                    {status === 'purchased' && purchasedBy && (
                        <span className={styles['wish-card__purchasedBy']}>Purchased by {purchasedBy}</span>
                    )}
                </div>

                <div className={styles['wish-card__actions']}>
                    {showGuestAction && (
                        <>
                            {status === 'wanted' && userId && (
                                <ReserveButton wishId={id} userId={userId} onReserve={onReserve} onError={onReserveError} useMock={useMock}/>
                            )}

                            {status === 'reserved' && reservedBy === userId && (
                                <CancelReservationButton wishId={id} onCancel={onCancelReservation} onError={onCancelError} useMock={useMock}/>
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

                            {status === 'reserved' && reservedBy === userId && userId && (
                                <MarkPurchasedButton 
                                    wishId={id}
                                    userId={userId}
                                    onMarkPurchased={onMarkPurchased} 
                                    onError={onMarkPurchasedError} 
                                    useMock={useMock}
                                />
                            )}
                        </>
                    )}
                    {showOwnerAction && (
                        <>
                            {(status === 'wanted' || status === 'reserved') && userId && (
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
                                Edit
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
            </div>
        </div>
    )
}
