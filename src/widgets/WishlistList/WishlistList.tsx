import { WishlistCard } from "@/widgets/WishlistCard"

import {TWishlist} from "@/entities/wishlist";

import styles from "./WishlistList.module.css"

type TWishlistList = {
  wishlists: TWishlist[]
  title?: string
  emptyMessage?: string
  showCreateButton?: boolean // New prop to control button visibility
}

export const WishlistList = ({
    wishlists,
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
            {wishlists.length} {wishlists.length === 1 ? "wishlist" : "wishlists"}
          </span>
            {showCreateButton && ( // Conditionally render the button
                <button className={styles.wishlistList__createButton}>Create New Wishlist</button>
            )}
          </div>
        </div>

        {wishlists.length === 0 ? (
            <div className={styles.wishlistList__empty}>
              <div className={styles.wishlistList__emptyIcon}>📝</div>
              <h3 className={styles.wishlistList__emptyTitle}>No Wishlists Yet</h3>
              <p className={styles.wishlistList__emptyMessage}>{emptyMessage}</p>
              {showCreateButton && ( // Conditionally render the button in empty state
                  <button className={styles.wishlistList__emptyButton}>Create Your First Wishlist</button>
              )}
            </div>
        ) : (
            <div className={styles.wishlistList__grid}>
              {wishlists.map((wishlist) => (
                  <WishlistCard
                      key={wishlist.id}
                      id={wishlist.id}
                      name={wishlist.name}
                      description={wishlist.description}
                      coverImage={wishlist.coverImage}
                      createdAt={wishlist.createdAt}
                      ownerId={wishlist.ownerId}
                      isPublic={wishlist.isPublic}
                  />
              ))}
            </div>
        )}
      </div>
  )
}
