import Image from "next/image"

import {TWish} from "@/entities/wish/Wish.types";

import styles from "./Wish.module.css"

export const Wish = ({
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
}: TWish) => {
  const getPriorityClass = () => {
    switch (priority) {
      case "high":
        return styles["wish__priority--high"]
      case "medium":
        return styles["wish__priority--medium"]
      case "low":
        return styles["wish__priority--low"]
      default:
        return styles["wish__priority--medium"]
    }
  }

  const getStatusClass = () => {
    switch (status) {
      case "purchased":
        return styles["wish__status--purchased"]
      case "reserved":
        return styles["wish__status--reserved"]
      case "proposed":
        return styles["wish__status--proposed"]
      case "wanted":
        return styles["wish__status--wanted"]
      default:
        return styles["wish__status--wanted"]
    }
  }

  return (
    <div className={`${styles.wish} ${status === "purchased" ? styles["wish--purchased"] : ""}`} data-id={id}>
      <div className={styles.wish__imageContainer}>
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={name}
          width={200}
          height={200}
          className={styles.wish__image}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UyZTJlMiIvPjwvc3ZnPg=="
          onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.backgroundColor = '#e2e2e2';
              target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Image transparente 1x1
          }}
        />
        <div className={`${styles.wish__priority} ${getPriorityClass()}`}>{priority}</div>
        <div className={`${styles.wish__status} ${getStatusClass()}`}>{status}</div>
      </div>

      <div className={styles.wish__content}>
        <div className={styles.wish__header}>
          <h3 className={styles.wish__title}>{name}</h3>
          <div className={styles.wish__price}>
            {currency}
            {price.toFixed(2)}
          </div>
        </div>

        <p className={styles.wish__description}>{description}</p>

        {notes && (
          <div className={styles.wish__notes}>
            <span className={styles.wish__notesLabel}>Notes:</span>
            <p className={styles.wish__notesText}>{notes}</p>
          </div>
        )}

        <div className={styles.wish__meta}>
          <span className={styles.wish__date}>Added {addedDate}</span>
        </div>

        <div className={styles.wish__actions}>
          {purchaseUrl && status === "wanted" && (
            <a
              href={purchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.wish__button} ${styles["wish__button--primary"]}`}
            >
              Buy Now
            </a>
          )}
          <button className={`${styles.wish__button} ${styles["wish__button--secondary"]}`}>Edit</button>
          <button className={`${styles.wish__button} ${styles["wish__button--danger"]}`}>Remove</button>
          {status === "wanted" && (
            <button className={`${styles.wish__button} ${styles["wish__button--success"]}`}>
              Mark Purchased
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
