import {WishlistCard} from '@/widgets/WishlistCard'
import {TWishlistList} from '@/widgets/WishlistList/WishlistList.types';

import styles from './WishlistList.module.css'
import {eventBus} from '@/shared/eventBus/lib/eventBus';

export const WishlistList = ({
  wishlistCardList,
  title = 'My Wishlists',
  emptyMessage = 'No wishlists found. Create your first wishlist to get started!',
  showCreateButton = false, // Default to false
}: TWishlistList) => {
  return (
    <div className={styles.wishlistList}>
      <div className={styles.wishlistList__header}>
        <h2 className={styles.wishlistList__title}>{title}</h2>
        <div className={styles.wishlistList__meta}>
          <span className={styles.wishlistList__count}>
            {wishlistCardList.length} {wishlistCardList.length === 1 ? 'wishlist' : 'wishlists'}
          </span>
          {showCreateButton && (
            <button className={styles.wishlistList__createButton} onClick={() => {
              eventBus.emit('wishlist:openCreationModal', {});
            }}>Create New Wishlist</button>
          )}
        </div>
      </div>

      {wishlistCardList.length === 0 ? (
        <div className={styles.wishlistList__empty}>
          <div className={styles.wishlistList__emptyIllustration} aria-hidden="true">
            <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Notepad body */}
              <rect x="28" y="26" width="104" height="88" rx="6" fill="#f2ede5" stroke="#d6cec4" strokeWidth="1.5"/>
              {/* Spine binding */}
              <rect x="28" y="26" width="16" height="88" rx="6 0 0 6" fill="#ebe5da" stroke="#d6cec4" strokeWidth="1.5"/>
              {/* Binding rings */}
              <circle cx="36" cy="46" r="4" fill="none" stroke="#b8b0a8" strokeWidth="1.5"/>
              <circle cx="36" cy="66" r="4" fill="none" stroke="#b8b0a8" strokeWidth="1.5"/>
              <circle cx="36" cy="86" r="4" fill="none" stroke="#b8b0a8" strokeWidth="1.5"/>
              {/* Ruled lines */}
              <line x1="54" y1="50" x2="118" y2="50" stroke="#d6cec4" strokeWidth="1.2"/>
              <line x1="54" y1="62" x2="118" y2="62" stroke="#d6cec4" strokeWidth="1.2"/>
              <line x1="54" y1="74" x2="100" y2="74" stroke="#d6cec4" strokeWidth="1.2"/>
              <line x1="54" y1="86" x2="110" y2="86" stroke="#d6cec4" strokeWidth="1.2"/>
              {/* Decorative tick marks */}
              <circle cx="58" cy="50" r="3" fill="#3f6845" opacity="0.3"/>
              <circle cx="58" cy="62" r="3" fill="#3f6845" opacity="0.3"/>
              {/* Left botanical sprig */}
              <path d="M28 72 Q14 64 18 54 Q24 60 28 72Z" fill="#3f6845" opacity="0.25"/>
              <path d="M28 86 Q12 80 15 68 Q22 74 28 86Z" fill="#3f6845" opacity="0.18"/>
              <line x1="28" y1="54" x2="28" y2="96" stroke="#3f6845" strokeWidth="1" opacity="0.2"/>
              {/* Top right flourish */}
              <path d="M118 26 Q128 16 132 22 Q128 30 118 26Z" fill="#3f6845" opacity="0.2"/>
              <path d="M124 20 Q130 10 135 15 Q130 22 124 20Z" fill="#3f6845" opacity="0.15"/>
              {/* Amber dot accent */}
              <circle cx="108" cy="34" r="3.5" fill="#6e3c0c" opacity="0.15"/>
            </svg>
          </div>
          <h3 className={styles.wishlistList__emptyTitle}>Nothing here yet</h3>
          <p className={styles.wishlistList__emptyMessage}>{emptyMessage}</p>
          {showCreateButton && (
            <button
              className={styles.wishlistList__emptyButton}
              onClick={() => eventBus.emit('wishlist:openCreationModal', {})}
            >
              Create your first wishlist
            </button>
          )}
        </div>
      ) : (
        <div className={styles.wishlistList__grid}>
          {wishlistCardList.map((wishlistCard) => (
            <WishlistCard
              key={wishlistCard.id}
              id={wishlistCard.id}
              name={wishlistCard.name}
              description={wishlistCard.description}
              coverImage={wishlistCard.coverImage}
              eventDate={wishlistCard.eventDate}
              createdAt={wishlistCard.createdAt}
              ownerId={wishlistCard.ownerId}
              ownerName={wishlistCard.ownerName}
              isPublic={wishlistCard.isPublic}
              itemCount={wishlistCard.itemCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}
