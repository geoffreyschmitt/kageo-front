import React from "react"

import Image from "next/image";

import {TProposedWishForm, TProposedWishFormData, TWishForm} from "@/entities/wish/ui/WishForm.types";

import styles from "./WishForm.module.css"



export const WishForm = <T extends TWishForm | TProposedWishForm>({
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSelectChange,
    handleCheckboxChange,
    handleSubmit,
    onCancel,
    isProposedWish
}: T) => {
    return (
        <form
            className={styles.wishForm}
            onSubmit={(e) => void handleSubmit(e)}
        >
            <div className={styles.wishForm__formGrid}>
                {/* Nom */}
                <label className={styles.wishForm__field}>
                    <span className={styles.wishForm__label}>Nom *</span>
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

                {/* Priorité */}
                {!isProposedWish && (
                    <label className={styles.wishForm__field}>
                        <span className={styles.wishForm__label}>Priorité</span>
                        <select
                            name="priority"
                            value={formData.priority}
                            onChange={(e) => handleSelectChange("priority", e.target.value)}
                            disabled={isSubmitting}
                            className={styles.wishForm__select}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </label>
                )}

                {/* Description */}
                <label
                    className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}
                >
                    <span className={styles.wishForm__label}>Description *</span>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("name", e.target.value)}
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
                    <span className={styles.wishForm__label}>Prix *</span>
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
                    <span className={styles.wishForm__label}>Image URL</span>
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

                {/* Purchase URL */}
                <label
                    className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}
                >
                    <span className={styles.wishForm__label}>Purchase URL</span>
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

                {/* Notes */}
                <label
                    className={`${styles.wishForm__field} ${styles['wishForm__field--full']}`}
                >
                    <span className={styles.wishForm__label}>Notes</span>
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
                        Show to Owner
                    </label>
                </div>
            )}

            {/* Preview */}
            {(formData.name || formData.imageUrl) && (
                <section className={styles.wishForm__preview}>
                    <h3 className={styles.wishForm__previewTitle}>Preview</h3>
                    <div className={styles.wishForm__previewCard}>
                        <div className={styles.wishForm__previewImage}>
                            {formData.imageUrl ? (
                                <Image
                                    src={formData.imageUrl}
                                    alt="Aperçu de l'image"
                                    width={600}
                                    height={400}
                                />
                            ) : (
                                <div>No image</div>
                            )}
                        </div>
                        <div className={styles.wishForm__previewContent}>
                            <strong className={styles.wishForm__previewName}>
                                {formData.name || "Item Name"}
                            </strong>
                            <p className={styles.wishForm__previewDescription}>
                                {formData.description || "Item description"}
                            </p>
                            <div className={styles.wishForm__previewMeta}>
                    <span className={styles.wishForm__previewPrice}>
                      {formData.currency}
                        {Number.isFinite(formData.price)
                            ? formData.price.toFixed(2)
                            : "0.00"}
                    </span>
                                {!isProposedWish && (
                    <span
                        className={`${styles.wishForm__previewPriority} ${
                            styles[`wishForm__previewPriority--${formData.priority}`]
                        }`}
                    >
                      {formData.priority}
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
                    Cancel
                </button>
                <button
                    type="submit"
                    className={`${styles.wishForm__button} ${styles['wishForm__button--primary']}`}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Adding..." : "Add Item"}
                </button>
            </footer>
        </form>
    )
}