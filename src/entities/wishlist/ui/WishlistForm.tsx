import React from "react"

import { WISHLIST_CATEGORIES } from "@/entities/wishlist"
import {TWishlistForm} from "@/entities/wishlist/ui/WishlistForm.types";

import styles from "./WishlistForm.module.css"


export const WishlistForm = ({
     formData,
     errors,
     isSubmitting,
     handleInputChange,
     handleSubmit,
     onCancel,
 }: TWishlistForm) => {
    return (
        <form className={styles.editWishlistForm} onSubmit={handleSubmit}>
            <div className={styles.editWishlistForm__formGrid}>
                {/* Wishlist Name */}
                <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                    <label className={styles.editWishlistForm__label} htmlFor="name">
                        Nom de la Wishlist *
                    </label>
                    <input
                        type="text"
                        id="name"
                        className={`${styles.editWishlistForm__input} ${errors.name ? styles["editWishlistForm__input--error"] : ""}`}
                        value={formData.name || ""}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Entrez le nom de la wishlist"
                    />
                    {errors.name && <span className={styles.editWishlistForm__error}>{errors.name}</span>}
                </div>

                {/* Description */}
                <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                    <label className={styles.editWishlistForm__label} htmlFor="description">
                        Description *
                    </label>
                    <textarea
                        id="description"
                        className={`${styles.editWishlistForm__textarea} ${errors.description ? styles["editWishlistForm__textarea--error"] : ""}`}
                        value={formData.description || ""}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Décrivez votre wishlist..."
                        rows={4}
                    />
                    {errors.description && <span className={styles.editWishlistForm__error}>{errors.description}</span>}
                </div>

                {/* Category */}
                <div className={styles.editWishlistForm__field}>
                    <label className={styles.editWishlistForm__label} htmlFor="category">
                        Catégorie
                    </label>
                    <select
                        id="category"
                        className={styles.editWishlistForm__select}
                        value={formData.category || ""}
                        onChange={(e) => handleInputChange("category", e.target.value)}
                    >
                        {WISHLIST_CATEGORIES.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Privacy Setting */}
                <div className={styles.editWishlistForm__field}>
                    <label className={styles.editWishlistForm__label}>Confidentialité</label>
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
                                <strong>Privée</strong>
                                <small>Seulement vous pouvez voir cette wishlist</small>
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
                                <strong>Publique</strong>
                                <small>Toute personne avec le lien peut voir</small>
                            </span>
                        </label>
                    </div>
                </div>

                {/* Cover Image */}
                <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                    <label className={styles.editWishlistForm__label} htmlFor="coverImage">
                        URL de l&#39;image de couverture
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

                {/* Settings Section */}
                <div className={`${styles.editWishlistForm__field} ${styles["editWishlistForm__field--full"]}`}>
                    <label className={styles.editWishlistForm__label}>Paramètres de la Wishlist</label>
                    <div className={styles.editWishlistForm__settingsGroup}>
                        <label className={styles.editWishlistForm__checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.allowComments}
                                onChange={(e) => handleInputChange("allowComments", e.target.checked)}
                                className={styles.editWishlistForm__checkbox}
                            />
                            <span className={styles.editWishlistForm__checkboxText}>
                                <strong>Autoriser les commentaires</strong>
                                <small>Permettre aux autres de laisser des commentaires</small>
                            </span>
                        </label>

                        <label className={styles.editWishlistForm__checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.allowSuggestions}
                                onChange={(e) => handleInputChange("allowSuggestions", e.target.checked)}
                                className={styles.editWishlistForm__checkbox}
                            />
                            <span className={styles.editWishlistForm__checkboxText}>
                                <strong>Autoriser les suggestions</strong>
                                <small>Permettre aux autres de suggérer des articles</small>
                            </span>
                        </label>

                        <label className={styles.editWishlistForm__checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.notifyOnPurchase}
                                onChange={(e) => handleInputChange("notifyOnPurchase", e.target.checked)}
                                className={styles.editWishlistForm__checkbox}
                            />
                            <span className={styles.editWishlistForm__checkboxText}>
                                <strong>Notifications d&#39;achat</strong>
                                <small>Être notifié quand quelqu&#39;un achète un article</small>
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className={styles.editWishlistForm__preview}>
                <h3 className={styles.editWishlistForm__previewTitle}>Aperçu</h3>
                <div className={styles.editWishlistForm__previewCard}>
                    {formData.coverImage && (
                        <div className={styles.editWishlistForm__previewImage}>
                            <img src={formData.coverImage || "/placeholder.svg"} alt="Aperçu de la couverture" />
                        </div>
                    )}
                    <div className={styles.editWishlistForm__previewContent}>
                        <div className={styles.editWishlistForm__previewHeader}>
                            <h4 className={styles.editWishlistForm__previewName}>{formData.name || "Nom de la Wishlist"}</h4>
                            <div className={styles.editWishlistForm__previewBadges}>
                                <span
                                    className={`${styles.editWishlistForm__previewBadge} ${formData.isPublic ? styles["editWishlistForm__previewBadge--public"] : styles["editWishlistForm__previewBadge--private"]}`}
                                >
                                    {formData.isPublic ? "Publique" : "Privée"}
                                </span>
                                <span className={styles.editWishlistForm__previewBadge}>
                                    {WISHLIST_CATEGORIES.find(cat => cat.value === formData.category)?.label || formData.category}
                                </span>
                            </div>
                        </div>
                        <p className={styles.editWishlistForm__previewDescription}>
                            {formData.description || "Description de la wishlist"}
                        </p>
                        <div className={styles.editWishlistForm__previewSettings}>
                            {formData.allowComments && (
                                <span className={styles.editWishlistForm__previewSetting}>💬 Commentaires</span>
                            )}
                            {formData.allowSuggestions && (
                                <span className={styles.editWishlistForm__previewSetting}>💡 Suggestions</span>
                            )}
                            {formData.notifyOnPurchase && (
                                <span className={styles.editWishlistForm__previewSetting}>🔔 Notifications</span>
                            )}
                        </div>
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
                    Annuler
                </button>
                <button
                    type="submit"
                    className={`${styles.editWishlistForm__button} ${styles["editWishlistForm__button--primary"]}`}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
            </div>
        </form>
    )
}