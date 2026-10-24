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
     formError,
 }: TWishlistForm) => {
    const t = useTranslations('wishlistForm')
    const uid = React.useId()
    const formRef = React.useRef<HTMLFormElement>(null)
    const errorId = (field: string) => `${uid}-${field}-error`
    const hasErrors = Object.values(errors).some(Boolean)

    // aria wiring shared by every field that can show an error.
    const invalid = (field: keyof typeof errors) => errors[field]
        ? { 'aria-invalid': true as const, 'aria-describedby': errorId(field) }
        : {}
    const fieldError = (field: keyof typeof errors) => errors[field] && (
        <small id={errorId(field)} className={styles.editWishlistForm__error}>{errors[field]}</small>
    )

    // After a failed validation, put the cursor in the first field that needs attention.
    const focusFirstInvalid = () => {
        window.setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
    }

    const [imgError, setImgError] = React.useState(false)
    React.useEffect(() => setImgError(false), [formData.coverImage])

    const coverUrl = formData.coverImage || ""
    const previewName = formData.name || t('previewName')

    return (
        <form
            ref={formRef}
            className={styles.editWishlistForm}
            noValidate
            onSubmit={(e) => {
                void handleSubmit(e)
                focusFirstInvalid()
            }}
        >
            <div className={styles.editWishlistForm__body}>
                <div className={styles.editWishlistForm__formGrid}>
                    {/* Wishlist Name */}
                    <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                        <label className={styles.editWishlistForm__label} htmlFor={`${uid}-name`}>
                            {t('nameLabel')}
                        </label>
                        <input
                            type="text"
                            id={`${uid}-name`}
                            aria-required="true"
                            {...invalid('name')}
                            className={`${styles.editWishlistForm__input} ${errors.name ? styles["editWishlistForm__input--error"] : ""}`}
                            value={formData.name || ""}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            placeholder={t('namePlaceholder')}
                        />
                        {fieldError('name')}
                    </div>

                    {/* Event Date */}
                    <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                        <label className={styles.editWishlistForm__label} htmlFor={`${uid}-eventDate`}>
                            {t('eventDateLabel')}
                        </label>
                        <input
                            type="date"
                            id={`${uid}-eventDate`}
                            aria-required="true"
                            {...invalid('eventDate')}
                            className={`${styles.editWishlistForm__input} ${errors.eventDate ? styles["editWishlistForm__input--error"] : ""}`}
                            value={formData.eventDate || ""}
                            onChange={(e) => handleInputChange("eventDate", e.target.value)}
                        />
                        {fieldError('eventDate')}
                    </div>

                    {/* Description */}
                    <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                        <label className={styles.editWishlistForm__label} htmlFor={`${uid}-description`}>
                            {t('descriptionLabel')}
                        </label>
                        <textarea
                            id={`${uid}-description`}
                            {...invalid('description')}
                            className={`${styles.editWishlistForm__textarea} ${errors.description ? styles["editWishlistForm__textarea--error"] : ""}`}
                            value={formData.description || ""}
                            onChange={(e) => handleInputChange("description", e.target.value)}
                            placeholder={t('descriptionPlaceholder')}
                            rows={3}
                        />
                        {fieldError('description')}
                    </div>

                    {/* Privacy Setting */}
                    <fieldset className={`${styles.editWishlistForm__field} ${styles.editWishlistForm__fieldset} ${styles["editWishlistForm__field--full"]}`}>
                        <legend className={styles.editWishlistForm__label}>{t('privacyLabel')}</legend>
                        <div className={styles.editWishlistForm__radioGroup}>
                            <label className={styles.editWishlistForm__radioLabel}>
                                <input
                                    type="radio"
                                    name={`${uid}-privacy`}
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
                                    name={`${uid}-privacy`}
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
                    </fieldset>

                    {/* Cover Image */}
                    <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                        <label className={styles.editWishlistForm__label} htmlFor={`${uid}-coverImage`}>
                            {t('coverImageLabel')}
                        </label>
                        <input
                            type="url"
                            id={`${uid}-coverImage`}
                            {...invalid('coverImage')}
                            className={`${styles.editWishlistForm__input} ${errors.coverImage ? styles["editWishlistForm__input--error"] : ""}`}
                            value={coverUrl}
                            onChange={(e) => handleInputChange("coverImage", e.target.value)}
                            placeholder="https://"
                        />
                        {fieldError('coverImage')}
                    </div>
                </div>

                {/* Preview: one line, so Save is never pushed away by a second card */}
                <section className={styles.editWishlistForm__preview} aria-label={t('preview')}>
                    <div className={styles.editWishlistForm__previewImage}>
                        {isValidUrl(coverUrl) && !imgError ? (
                            <Image
                                src={coverUrl}
                                alt=""
                                width={120}
                                height={120}
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <span
                                className={styles.editWishlistForm__previewInitial}
                                role={imgError ? "img" : undefined}
                                aria-label={imgError ? t('imageLoadError') : undefined}
                                aria-hidden={imgError ? undefined : true}
                            >
                                {previewName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <strong className={styles.editWishlistForm__previewName}>{previewName}</strong>
                    <span
                        className={`${styles.editWishlistForm__previewBadge} ${formData.isPublic ? styles["editWishlistForm__previewBadge--public"] : ""}`}
                    >
                        {formData.isPublic ? t('publicLabel') : t('privateLabel')}
                    </span>
                </section>
            </div>

            {/* Actions stay in view while the fields scroll */}
            <footer className={styles.editWishlistForm__actions}>
                {(formError || hasErrors) && (
                    <p className={styles.editWishlistForm__formError} role="alert">
                        {formError || t('fixErrors')}
                    </p>
                )}
                <div className={styles.editWishlistForm__buttons}>
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
            </footer>
        </form>
    )
}
