import React from "react"

import Image from "next/image";
import { useTranslations } from "next-intl"

import {TWishlistForm} from "@/entities/wishlist/ui/WishlistForm.types";
import {isValidUrl} from "@/shared/lib/isValidUrl";

import styles from "./WishlistForm.module.css"


export const WishlistForm = ({
     formData,
     errors,
     isSubmitting,
     handleInputChange,
     handleSubmit,
     onCancel,
 }: TWishlistForm) => {
    const t = useTranslations('wishlistForm')

    const [imgError, setImgError] = React.useState(false)
    React.useEffect(() => setImgError(false), [formData.coverImage])

    return (
        <form className={styles.editWishlistForm} onSubmit={handleSubmit}>
            <div className={styles.editWishlistForm__formGrid}>
                {/* Wishlist Name */}
                <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                    <label className={styles.editWishlistForm__label} htmlFor="name">
                        {t('nameLabel')}
                    </label>
                    <input
                        type="text"
                        id="name"
                        className={`${styles.editWishlistForm__input} ${errors.name ? styles["editWishlistForm__input--error"] : ""}`}
                        value={formData.name || ""}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder={t('namePlaceholder')}
                    />
                    {errors.name && <span className={styles.editWishlistForm__error}>{errors.name}</span>}
                </div>

                {/* Description */}
                <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                    <label className={styles.editWishlistForm__label} htmlFor="description">
                        {t('descriptionLabel')}
                    </label>
                    <textarea
                        id="description"
                        className={`${styles.editWishlistForm__textarea} ${errors.description ? styles["editWishlistForm__textarea--error"] : ""}`}
                        value={formData.description || ""}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder={t('descriptionPlaceholder')}
                        rows={4}
                    />
                    {errors.description && <span className={styles.editWishlistForm__error}>{errors.description}</span>}
                </div>

                {/* Event Date */}
                <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                    <label className={styles.editWishlistForm__label} htmlFor="eventDate">
                        {t('eventDateLabel')}
                    </label>
                    <input
                        type="date"
                        id="eventDate"
                        className={`${styles.editWishlistForm__input} ${errors.eventDate ? styles["editWishlistForm__input--error"] : ""}`}
                        value={formData.eventDate || ""}
                        onChange={(e) => handleInputChange("eventDate", e.target.value)}
                    />
                    {errors.eventDate && <span className={styles.editWishlistForm__error}>{errors.eventDate}</span>}
                </div>

                {/* Privacy Setting */}
                <div className={styles.editWishlistForm__field}>
                    <label className={styles.editWishlistForm__label}>{t('privacyLabel')}</label>
                    <div className={styles.editWishlistForm__radioGroup}>
                        <label className={styles.editWishlistForm__radioLabel}>
                            <input
                                type="radio"
                                name="privacy"
                                checked={!formData.isPublic}
                                onChange={() => handleInputChange("isPublic", false)}
                                className={styles.editWishlistForm__radio}
                            />
                            <span className={styles.editWishlistForm__radioText}>
                                <strong>{t('privateLabel')}</strong>
                                <small>{t('privateDesc')}</small>
                            </span>
                        </label>
                        <label className={styles.editWishlistForm__radioLabel}>
                            <input
                                type="radio"
                                name="privacy"
                                checked={formData.isPublic}
                                onChange={() => handleInputChange("isPublic", true)}
                                className={styles.editWishlistForm__radio}
                            />
                            <span className={styles.editWishlistForm__radioText}>
                                <strong>{t('publicLabel')}</strong>
                                <small>{t('publicDesc')}</small>
                            </span>
                        </label>
                    </div>
                </div>

                {/* Cover Image */}
                <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                    <label className={styles.editWishlistForm__label} htmlFor="coverImage">
                        {t('coverImageLabel')}
                    </label>
                    <input
                        type="url"
                        id="coverImage"
                        className={`${styles.editWishlistForm__input} ${errors.coverImage ? styles["editWishlistForm__input--error"] : ""}`}
                        value={formData.coverImage || ""}
                        onChange={(e) => handleInputChange("coverImage", e.target.value)}
                        placeholder="https://example.com/cover-image.jpg"
                    />
                    {errors.coverImage && <span className={styles.editWishlistForm__error}>{errors.coverImage}</span>}
                </div>
            </div>

            {/* Preview */}
            <div className={styles.editWishlistForm__preview}>
                <h3 className={styles.editWishlistForm__previewTitle}>{t('preview')}</h3>
                <div className={styles.editWishlistForm__previewCard}>
                    {isValidUrl(formData.coverImage || "") && (
                        <div className={styles.editWishlistForm__previewImage}>
                            {imgError ? (
                                <span className={styles.editWishlistForm__previewImageError}>
                                    {t('imageLoadError')}
                                </span>
                            ) : (
                                <Image
                                    src={formData.coverImage as string} alt={t('preview')}
                                    width={600}
                                    height={400}
                                    onError={() => setImgError(true)}
                                />
                            )}
                        </div>
                    )}
                    <div className={styles.editWishlistForm__previewContent}>
                        <div className={styles.editWishlistForm__previewHeader}>
                            <h4 className={styles.editWishlistForm__previewName}>{formData.name || t('previewName')}</h4>
                            <div className={styles.editWishlistForm__previewBadges}>
                                <span
                                    className={`${styles.editWishlistForm__previewBadge} ${formData.isPublic ? styles["editWishlistForm__previewBadge--public"] : styles["editWishlistForm__previewBadge--private"]}`}
                                >
                                    {formData.isPublic ? t('publicLabel') : t('privateLabel')}
                                </span>
                            </div>
                        </div>
                        <p className={styles.editWishlistForm__previewDescription}>
                            {formData.description || t('previewDescription')}
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.editWishlistForm__actions}>
                <button
                    type="button"
                    className={`${styles.editWishlistForm__button} ${styles["editWishlistForm__button--secondary"]}`}
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    className={`${styles.editWishlistForm__button} ${styles["editWishlistForm__button--primary"]}`}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? t('saving') : t('save')}
                </button>
            </div>
        </form>
    )
}