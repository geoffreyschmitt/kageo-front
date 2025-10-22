import Image from "next/image"
import styles from "./wish-item.module.css"

interface WishItemProps {
  id: string
  name: string
  description: string
  price: number
  currency: string
  imageUrl: string
  priority: "low" | "medium" | "high"
  status: "wanted" | "purchased" | "reserved"
  purchaseUrl?: string
  notes?: string
  addedDate: string
}

export default function WishItem({
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
}: WishItemProps) {
  const getPriorityClass = () => {
    switch (priority) {
      case "high":
        return styles["wishItem__priority--high"]
      case "medium":
        return styles["wishItem__priority--medium"]
      case "low":
        return styles["wishItem__priority--low"]
      default:
        return styles["wishItem__priority--medium"]
    }
  }

  const getStatusClass = () => {
    switch (status) {
      case "purchased":
        return styles["wishItem__status--purchased"]
      case "reserved":
        return styles["wishItem__status--reserved"]
      case "wanted":
        return styles["wishItem__status--wanted"]
      default:
        return styles["wishItem__status--wanted"]
    }
  }

  return (
    <div className={`${styles.wishItem} ${status === "purchased" ? styles["wishItem--purchased"] : ""}`}>
      <div className={styles.wishItem__imageContainer}>
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={name}
          width={200}
          height={200}
          className={styles.wishItem__image}
        />
        <div className={`${styles.wishItem__priority} ${getPriorityClass()}`}>{priority}</div>
        <div className={`${styles.wishItem__status} ${getStatusClass()}`}>{status}</div>
      </div>

      <div className={styles.wishItem__content}>
        <div className={styles.wishItem__header}>
          <h3 className={styles.wishItem__title}>{name}</h3>
          <div className={styles.wishItem__price}>
            {currency}
            {price.toFixed(2)}
          </div>
        </div>

        <p className={styles.wishItem__description}>{description}</p>

        {notes && (
          <div className={styles.wishItem__notes}>
            <span className={styles.wishItem__notesLabel}>Notes:</span>
            <p className={styles.wishItem__notesText}>{notes}</p>
          </div>
        )}

        <div className={styles.wishItem__meta}>
          <span className={styles.wishItem__date}>Added {addedDate}</span>
        </div>

        <div className={styles.wishItem__actions}>
          {purchaseUrl && status === "wanted" && (
            <a
              href={purchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.wishItem__button} ${styles["wishItem__button--primary"]}`}
            >
              Buy Now
            </a>
          )}
          <button className={`${styles.wishItem__button} ${styles["wishItem__button--secondary"]}`}>Edit</button>
          <button className={`${styles.wishItem__button} ${styles["wishItem__button--danger"]}`}>Remove</button>
          {status === "wanted" && (
            <button className={`${styles.wishItem__button} ${styles["wishItem__button--success"]}`}>
              Mark Purchased
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
