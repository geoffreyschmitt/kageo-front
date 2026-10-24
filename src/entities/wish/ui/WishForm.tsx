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
    formError,
}: T) => {
    const t = useTranslations('wishForm')
    const locale = useLocale()
    const uid = React.useId()
    const formRef = React.useRef<HTMLFormElement>(null)
    const errorId = (field: string) => `${uid}-${field}-error`
    const hasErrors = Object.values(errors).some(Boolean)

    // aria wiring shared by every field that can show an error.
    const invalid = (field: keyof typeof errors) => errors[field]
        ? { 'aria-invalid': true as const, 'aria-describedby': errorId(field as string) }
        : {}
    const fieldError = (field: keyof typeof errors) => errors[field] && (
        <small id={errorId(field as string)} className={styles.wishForm__error}>{errors[field]}</small>
    )

    // After a failed validation, put the cursor in the first field that needs attention.
    const focusFirstInvalid = () => {
        window.setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
    }

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
        </div>
    )

    return (
        <form
            ref={formRef}
            className={styles.wishForm}
            noValidate
            onSubmit={(e) => {
                void handleSubmit(e)
                focusFirstInvalid()
            }}
        >
          <div className={styles.wishForm__body}>
            <div className={styles.wishForm__formGrid}>
                {/* Purchase URL (first: it can fill the rest of the form) */}
                <div className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}>
                    <label className={styles.wishForm__field}>
                        <span className={styles.wishForm__label}>{t('purchaseUrlLabel')}</span>
                        <input
                            name="purchaseUrl"
                            type="url"
                            inputMode="url"
                            autoComplete="off"
                            placeholder="https://"
                            value={formData.purchaseUrl}
                            onChange={(e) => handleInputChange("purchaseUrl", e.target.value)}
                            disabled={isSubmitting}
                            className={`${styles.wishForm__input} ${errors.purchaseUrl ? styles['wishForm__input--error'] : ""}`}
                            {...invalid('purchaseUrl')}
                        />
                    </label>
                    {fieldError('purchaseUrl')}
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
                <div className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}>
                    <label className={styles.wishForm__field}>
                        <span className={styles.wishForm__label}>{t('nameLabel')}</span>
                        <input
                            name="name"
                            autoComplete="off"
                            aria-required="true"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            disabled={isSubmitting}
                            className={`${styles.wishForm__input} ${
                                errors.name ? styles['wishForm__input--error'] : ""
                            }`}
                            {...invalid('name')}
                        />
                    </label>
                    {fieldError('name')}
                </div>

                {/* Favourite: a wish is either normal or a favourite (priority 'high') */}
                {!isProposedWish && (
                    <div className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}>
                        <label className={styles.wishForm__favorite}>
                            <input
                                type="checkbox"
                                name="priority"
                                checked={formData.priority === 'high'}
                                onChange={(e) => handleSelectChange("priority", e.target.checked ? 'high' : 'medium')}
                                disabled={isSubmitting}
                                aria-describedby={`${uid}-favorite-hint`}
                            />
                            <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M8 13.6S1.8 9.9 1.8 5.7A3.2 3.2 0 0 1 8 4.3a3.2 3.2 0 0 1 6.2 1.4C14.2 9.9 8 13.6 8 13.6z"/>
                            </svg>
                            <span>{t('favoriteLabel')}</span>
                        </label>
                        <small id={`${uid}-favorite-hint`} className={styles.wishForm__hint}>{t('favoriteHint')}</small>
                    </div>
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
                        {...invalid('description')}
                    />
                </label>

                {/* Prix */}
                <div className={styles.wishForm__field}>
                    <label className={styles.wishForm__field}>
                        <span className={styles.wishForm__label}>{t('priceLabel')}</span>
                        <span className={styles.wishForm__priceGroup}>
                            <select
                                name="currency"
                                aria-label={t('currencyLabel')}
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
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                aria-required="true"
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
                                {...invalid('price')}
                            />
                        </span>
                    </label>
                    {fieldError('price')}
                </div>

                {/* Image URL */}
                <div className={styles.wishForm__field}>
                    <label className={styles.wishForm__field}>
                        <span className={styles.wishForm__label}>{t('imageUrlLabel')}</span>
                        <input
                            name="imageUrl"
                            type="url"
                            inputMode="url"
                            autoComplete="off"
                            placeholder="https://"
                            value={formData.imageUrl}
                            onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                            disabled={isSubmitting}
                            className={`${styles.wishForm__input} ${errors.imageUrl ? styles['wishForm__input--error'] : ""}`}
                            {...invalid('imageUrl')}
                        />
                    </label>
                    {fieldError('imageUrl')}
                </div>

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
                <label className={styles.wishForm__check}>
                    <input
                        type="checkbox"
                        checked={(formData as unknown as TProposedWishFormData).showToOwner}
                        onChange={e => handleCheckboxChange("showToOwner", e.target.checked)}
                    />
                    <span>{t('showToOwner')}</span>
                </label>
            )}

            {/* Preview: one line, so Save is never pushed away by a second card */}
            {(formData.name || formData.imageUrl) && (
                <section className={styles.wishForm__preview} aria-label={t('preview')}>
                    <div className={styles.wishForm__previewImage}>
                        {isValidUrl(formData.imageUrl) && !imgError ? (
                            <Image
                                src={formData.imageUrl}
                                alt={t('previewImageAlt')}
                                width={120}
                                height={120}
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            previewPlaceholder
                        )}
                    </div>
                    <strong className={styles.wishForm__previewName}>
                        {formData.name || t('previewName')}
                    </strong>
                    <span className={styles.wishForm__previewPrice}>
                        {formData.currency}
                        {Number.isFinite(formData.price) && formData.price > 0
                            ? new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(formData.price)
                            : '—'}
                    </span>
                    {!isProposedWish && formData.priority === 'high' && (
                        <span className={styles.wishForm__previewPriority}>
                            {t('priorityHighBadge')}
                        </span>
                    )}
                </section>
            )}
          </div>

            {/* Actions stay in view while the fields scroll */}
            <footer className={styles.wishForm__actions}>
                {(formError || hasErrors) && (
                    <p className={styles.wishForm__formError} role="alert">
                        {formError || t('fixErrors')}
                    </p>
                )}
                <div className={styles.wishForm__buttons}>
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
                </div>
            </footer>
        </form>
    )
}
