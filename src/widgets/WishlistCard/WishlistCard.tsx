import NextLink from "next/link"
import Image from "next/image"
import styles from "./WishlistCard.module.css"

type TWishlistCard = {
  id: string
  name: string
  description: string
  itemCount: number
  coverImage: string
  createdDate: string
  isPublic: boolean
  ownerName?: string
}

export const WishlistCard = ({
  id,
  name,
  description,
  itemCount,
  coverImage,
  createdDate,
  isPublic,
  ownerName
}: TWishlistCard) => {
  return (
    <div className={styles.wishlistCard}>
      <div className={styles.wishlistCard__imageContainer}>
        <Image
          src={coverImage || "/placeholder.svg"}
          alt={`${name} wishlist cover`}
          width={300}
          height={200}
          className={styles.wishlistCard__image}
        />
        <div
          className={`${styles.wishlistCard__badge} ${isPublic ? styles["wishlistCard__badge--public"] : styles["wishlistCard__badge--private"]}`}
        >
          {isPublic ? "Public" : "Private"}
        </div>
      </div>

      <div className={styles.wishlistCard__content}>
        <div className={styles.wishlistCard__header}>
          <h3 className={styles.wishlistCard__title}>{name}</h3>
          <span className={styles.wishlistCard__count}>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        <p className={styles.wishlistCard__description}>{description}</p>

        <div className={styles.wishlistCard__footer}>
          <span className={styles.wishlistCard__date}>Created {createdDate}</span>
          {ownerName && (
              <span className={styles.wishlistCard__owner}>By {ownerName}</span>
          )}
          <div className={styles.wishlistCard__actions}>
            <button className={`${styles.wishlistCard__button} ${styles["wishlistCard__button--secondary"]}`}>
              Edit
            </button>
            <NextLink href={`/wishlist/${id}`} className={`${styles.wishlistCard__button} ${styles["wishlistCard__button--primary"]}`}>
              View
            </NextLink>
          </div>
        </div>
      </div>
    </div>
  )
}
