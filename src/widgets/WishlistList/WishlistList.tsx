import { WishlistCard } from "@/widgets/WishlistCard"
import {TWishlistList} from "@/widgets/WishlistList/WishlistList.types";

import styles from "./WishlistList.module.css"

export const WishlistList = ({
    wishlistCardList,
    title = "My Wishlists",
    emptyMessage = "No wishlists found. Create your first wishlist to get started!",
    showCreateButton = false, // Default to false
}: TWishlistList) => {
  return (
      <div className={styles.wishlistList}>
        <div className={styles.wishlistList__header}>
          <h2 className={styles.wishlistList__title}>{title}</h2>
          <div className={styles.wishlistList__meta}>
          <span className={styles.wishlistList__count}>
            {wishlistCardList.length} {wishlistCardList.length === 1 ? "wishlist" : "wishlists"}
          </span>
            {showCreateButton && ( // Conditionally render the button
                <button className={styles.wishlistList__createButton}>Create New Wishlist</button>
            )}
          </div>
        </div>

        {wishlistCardList.length === 0 ? (
            <div className={styles.wishlistList__empty}>
              <div className={styles.wishlistList__emptyIcon}>📝</div>
              <h3 className={styles.wishlistList__emptyTitle}>No Wishlists Yet</h3>
              <p className={styles.wishlistList__emptyMessage}>{emptyMessage}</p>
              {showCreateButton && (
                  <button className={styles.wishlistList__emptyButton}>Create Your First Wishlist</button>
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
