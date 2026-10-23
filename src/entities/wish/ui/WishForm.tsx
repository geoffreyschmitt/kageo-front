import React from "react"

import Image from "next/image";

import { useLocale, useTranslations } from "next-intl"

import {formatVersionPrice, type TVersionChoice} from "@/entities/wish/model/importFlow";
import {TProposedWishForm, TProposedWishFormData, TWishForm} from "@/entities/wish/ui/WishForm.types";

import {isValidUrl} from "@/shared/lib/isValidUrl";

import styles from "./WishForm.module.css"


// Version button text: its label, then its price in the reader's locale. A version without a
// label shows only its price; one with neither shows "Version {n}" (fallback).
const formatVersion = (
    version: TVersionChoice,
    index: number,
    locale: string,
    fallback: (n: number) => string,
): string => {
    const label = version.label.trim()
    const price = version.price !== undefined && Number.isFinite(version.price)
        ? formatVersionPrice(version.price, version.currency, locale)
        : ""
    return [label, price].filter(Boolean).join(" · ") || fallback(index + 1)
}

export const WishForm = <T extends TWishForm | TProposedWishForm>({
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSelectChange,
    handleCheckboxChange,
    handleSubmit,
    onCancel,
    isProposedWish,
    submitLabel,
    submittingLabel,
    linkImport,
}: T) => {
    const t = useTranslations('wishForm')
    const locale = useLocale()

    const [imgError, setImgError] = React.useState(false)
    React.useEffect(() => setImgError(false), [formData.imageUrl])

    const previewPlaceholder = (
        <div
            className={styles.wishForm__previewPlaceholder}
            role="img"
            aria-label={imgError ? t('imageLoadError') : t('noImage')}
        >
            <span className={styles.wishForm__previewPlaceholderInitial}>
                {(formData.name || t('previewName')).charAt(0).toUpperCase()}
            </span>
            <svg
                className={styles.wishForm__previewPlaceholderDecor}
                viewBox="0 0 200 200"
                fill="none"
                aria-hidden="true"
            >
                <path d="M100 160 Q80 140 70 110 Q60 80 80 60 Q100 40 120 60 Q140 80 130 110 Q120 140 100 160Z" fill="#3f6845" opacity="0.08"/>
                <path d="M50 120 Q35 100 45 80 Q55 60 75 70 Q95 80 85 105 Q75 130 50 120Z" fill="#3f6845" opacity="0.06"/>
                <path d="M150 120 Q165 100 155 80 Q145 60 125 70 Q105 80 115 105 Q125 130 150 120Z" fill="#3f6845" opacity="0.06"/>
                <circle cx="100" cy="55" r="5" fill="#6e3c0c" opacity="0.1"/>
                <circle cx="72" cy="68" r="3" fill="#3f6845" opacity="0.1"/>
                <circle cx="128" cy="68" r="3" fill="#3f6845" opacity="0.1"/>
            </svg>
            {imgError && (
                <small className={styles.wishForm__previewImageError}>
                    {t('imageLoadError')}
                </small>
            )}
        </div>
    )

    return (
        <form
            className={styles.wishForm}
            onSubmit={(e) => void handleSubmit(e)}
        >
            <div className={styles.wishForm__formGrid}>
                {/* Purchase URL (first: it can fill the rest of the form) */}
                <div className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}>
                    <label className={styles.wishForm__field}>
                        <span className={styles.wishForm__label}>{t('purchaseUrlLabel')}</span>
                        <input
                            name="purchaseUrl"
                            value={formData.purchaseUrl}
                            onChange={(e) => handleInputChange("purchaseUrl", e.target.value)}
                            disabled={isSubmitting}
                            className={styles.wishForm__input}
                        />
                        {errors.purchaseUrl && (
                            <small className={styles.wishForm__error}>
                                {errors.purchaseUrl}
                            </small>
                        )}
                    </label>
                    {linkImport && (
                        <div className={styles.wishForm__import}>
                            <button
                                type="button"
                                className={`${styles.wishForm__button} ${styles['wishForm__button--secondary']} ${styles.wishForm__fillButton}`}
                                onClick={linkImport.onFill}
                                disabled={!linkImport.canFill || linkImport.status === 'loading' || isSubmitting}
                            >
                                {t('import.fill')}
                            </button>
                            <div role="status" aria-live="polite">
                                {linkImport.status === 'loading' && (
                                    <p className={styles.wishForm__importNote}>{t('import.looking')}</p>
                                )}
                                {linkImport.status === 'found' && (
                                    <p className={styles.wishForm__importNote}>{t('import.found')}</p>
                                )}
                                {linkImport.status === 'notFound' && (
                                    <p className={styles.wishForm__importNote}>{t('import.notFound')}</p>
                                )}
                                {linkImport.status === 'chooseMode' && (
                                    <div className={styles.wishForm__importQuestion}>
                                        <p className={styles.wishForm__importNote}>{t('import.modeQuestion')}</p>
                                        <div className={styles.wishForm__importActions}>
                                            <button
                                                type="button"
                                                className={`${styles.wishForm__button} ${styles['wishForm__button--primary']}`}
                                                onClick={() => linkImport.onChooseMode('replace')}
                                                disabled={isSubmitting}
                                            >
                                                {t('import.replace')}
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.wishForm__button} ${styles['wishForm__button--secondary']}`}
                                                onClick={() => linkImport.onChooseMode('fillEmpty')}
                                                disabled={isSubmitting}
                                            >
                                                {t('import.fillEmpty')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {linkImport.status === 'chooseVersion' && (
                                    <div className={styles.wishForm__importQuestion}>
                                        <p className={styles.wishForm__importNote}>{t('import.versionQuestion')}</p>
                                        <div className={styles.wishForm__importActions}>
                                            {linkImport.versions.map((version, index) => (
                                                <button
                                                    key={`${index}-${version.label}`}
                                                    type="button"
                                                    className={`${styles.wishForm__button} ${styles['wishForm__button--secondary']} ${styles.wishForm__versionButton}`}
                                                    onClick={() => linkImport.onChooseVersion(index)}
                                                    disabled={isSubmitting}
                                                >
                                                    {formatVersion(version, index, locale, (n) => t('import.versionFallback', { n }))}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Nom */}
                <label className={styles.wishForm__field}>
                    <span className={styles.wishForm__label}>{t('nameLabel')}</span>
                    <input
                        name="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        disabled={isSubmitting}
                        className={`${styles.wishForm__input} ${
                            errors.name ? styles['wishForm__input--error'] : ""
                        }`}
                    />
                    {errors.name && (
                        <small className={styles.wishForm__error}>
                            {errors.name}
                        </small>
                    )}
                </label>

                {/* Favourite: a wish is either normal or a favourite (priority 'high') */}
                {!isProposedWish && (
                    <label className={styles.wishForm__favorite}>
                        <input
                            type="checkbox"
                            name="priority"
                            checked={formData.priority === 'high'}
                            onChange={(e) => handleSelectChange("priority", e.target.checked ? 'high' : 'medium')}
                            disabled={isSubmitting}
                        />
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M8 13.6S1.8 9.9 1.8 5.7A3.2 3.2 0 0 1 8 4.3a3.2 3.2 0 0 1 6.2 1.4C14.2 9.9 8 13.6 8 13.6z"/>
                        </svg>
                        <span>{t('favoriteLabel')}</span>
                    </label>
                )}

                {/* Description */}
                <label
                    className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}
                >
                    <span className={styles.wishForm__label}>{t('descriptionLabel')}</span>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={3}
                        disabled={isSubmitting}
                        className={`${styles.wishForm__textarea} ${
                            errors.description ? styles['wishForm__textarea--error'] : ""
                        }`}
                    />
                    {errors.description && (
                        <small className={styles.wishForm__error}>
                            {errors.description}
                        </small>
                    )}
                </label>

                {/* Prix */}
                <label className={styles.wishForm__field}>
                    <span className={styles.wishForm__label}>{t('priceLabel')}</span>
                    <div className={styles.wishForm__priceGroup}>
                        <select
                            name="currency"
                            value={formData.currency}
                            onChange={(e) => handleSelectChange("currency", e.target.value)}
                            disabled={isSubmitting}
                            className={`${styles.wishForm__select} ${styles.wishForm__currencySelect}`}
                        >
                            <option value="€">EUR (€)</option>
                            <option value="$">USD ($)</option>
                            <option value="£">GBP (£)</option>
                            <option value="¥">JPY (¥)</option>
                        </select>
                        <input
                            name="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                                Number.isFinite(formData.price) && formData.price !== 0
                                    ? String(formData.price)
                                    : ""
                            }
                            onChange={(e) =>
                                handleInputChange("price", Number.parseFloat(e.target.value || "0"))
                            }
                            disabled={isSubmitting}
                            className={`${styles.wishForm__input} ${
                                errors.price ? styles['wishForm__input--error'] : ""
                            }`}
                        />
                    </div>
                    {errors.price && (
                        <small className={styles.wishForm__error}>
                            {errors.price}
                        </small>
                    )}
                </label>

                {/* Image URL */}
                <label className={styles.wishForm__field}>
                    <span className={styles.wishForm__label}>{t('imageUrlLabel')}</span>
                    <input
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                        disabled={isSubmitting}
                        className={styles.wishForm__input}
                    />
                    {errors.imageUrl && (
                        <small className={styles.wishForm__error}>
                            {errors.imageUrl}
                        </small>
                    )}
                </label>

                {/* Notes */}
                <label
                    className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}
                >
                    <span className={styles.wishForm__label}>{t('notesLabel')}</span>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        rows={2}
                        disabled={isSubmitting}
                        className={styles.wishForm__textarea}
                    />
                </label>
            </div>

            {/* Show to Owner */}
            {isProposedWish && (
                <div className={`${styles.proposeWishModal__field} ${styles["wishForm__field--full"]}`}>
                    <label className={styles.proposeWishModal__checkbox}>
                        <input
                            type="checkbox"
                            checked={(formData as unknown as TProposedWishFormData).showToOwner}
                            onChange={e => handleCheckboxChange("showToOwner", e.target.checked)}
                        />
                        {t('showToOwner')}
                    </label>
                </div>
            )}

            {/* Preview */}
            {(formData.name || formData.imageUrl) && (
                <section className={styles.wishForm__preview}>
                    <h3 className={styles.wishForm__previewTitle}>{t('preview')}</h3>
                    <div className={styles.wishForm__previewCard}>
                        <div className={styles.wishForm__previewImage}>
                            {isValidUrl(formData.imageUrl) && !imgError ? (
                                <Image
                                    src={formData.imageUrl}
                                    alt={t('previewImageAlt')}
                                    width={600}
                                    height={400}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                previewPlaceholder
                            )}
                        </div>
                        <div className={styles.wishForm__previewContent}>
                            <strong className={styles.wishForm__previewName}>
                                {formData.name || t('previewName')}
                            </strong>
                            <p className={styles.wishForm__previewDescription}>
                                {formData.description || t('previewDescription')}
                            </p>
                            <div className={styles.wishForm__previewMeta}>
                    <span className={styles.wishForm__previewPrice}>
                      {formData.currency}
                        {Number.isFinite(formData.price)
                            ? formData.price.toFixed(2)
                            : "0.00"}
                    </span>
                                {!isProposedWish && formData.priority === 'high' && (
                    <span
                        className={`${styles.wishForm__previewPriority} ${styles['wishForm__previewPriority--high']}`}
                    >
                      {t('priorityHighBadge')}
                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Actions */}
            <footer className={styles.wishForm__actions}>
                <button
                    type="button"
                    className={`${styles.wishForm__button} ${styles['wishForm__button--secondary']}`}
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    className={`${styles.wishForm__button} ${styles['wishForm__button--primary']}`}
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? (submittingLabel ?? t('adding'))
                        : (submitLabel ?? t('addItem'))}
                </button>
            </footer>
        </form>
    )
}