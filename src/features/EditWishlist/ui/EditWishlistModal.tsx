import React, {useState} from "react";
import styles from "./EditWishlistModal.module.css";
import {TEditWishlistModal} from "@/features/EditWishlist/ui/EditWishlistModal.types";
import {TEditWishlistFormData} from "@/features/EditWishlist/model";

export const EditWishlistModal = ({ isOpen, onClose, onSubmit, initialData }: TEditWishlistModal) => {
    const [formData, setFormData] = useState<TEditWishlistFormData>({
        name: initialData.name || "",
        description: initialData.description || "",
        isPublic: initialData.isPublic || false,
        coverImage: initialData.coverImage || "",
        category: initialData.category || "general",
        allowComments: initialData.allowComments ?? true,
        allowSuggestions: initialData.allowSuggestions ?? true,
        notifyOnPurchase: initialData.notifyOnPurchase ?? true,
    })

    const [errors, setErrors] = useState<Partial<TEditWishlistFormData>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const validateForm = (): boolean => {
        const newErrors: Partial<TEditWishlistFormData> = {}

        if (!formData.name.trim()) {
            newErrors.name = "Wishlist name is required"
        } else if (formData.name.trim().length < 3) {
            newErrors.name = "Wishlist name must be at least 3 characters"
        }

        if (!formData.description.trim()) {
            newErrors.description = "Description is required"
        } else if (formData.description.trim().length < 10) {
            newErrors.description = "Description must be at least 10 characters"
        }

        if (formData.coverImage && !isValidUrl(formData.coverImage)) {
            newErrors.coverImage = "Please enter a valid image URL"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const isValidUrl = (url: string): boolean => {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000))
            onSubmit(formData)
            handleClose()
        } catch (error) {
            console.error("Error updating wishlist:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setErrors({})
        onClose()
    }

    const handleInputChange = (field: keyof TEditWishlistFormData, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    if (!isOpen) return null

    return (
        <div className={styles.editWishlistModal}>
            <div className={styles.editWishlistModal__overlay} onClick={handleClose} />
            <div className={styles.editWishlistModal__container}>
                <div className={styles.editWishlistModal__header}>
                    <h2 className={styles.editWishlistModal__title}>Edit Wishlist</h2>
                    <button className={styles.editWishlistModal__closeButton} onClick={handleClose}>
                        ×
                    </button>
                </div>

                <form className={styles.editWishlistModal__form} onSubmit={handleSubmit}>
                    <div className={styles.editWishlistModal__formGrid}>
                        {/* Wishlist Name */}
                        <div className={`${styles.editWishlistModal__field} ${styles["editWishlistModal__field--full"]}`}>
                            <label className={styles.editWishlistModal__label} htmlFor="name">
                                Wishlist Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                className={`${styles.editWishlistModal__input} ${errors.name ? styles["editWishlistModal__input--error"] : ""}`}
                                value={formData.name}
                                onChange={(e) => handleInputChange("name", e.target.value)}
                                placeholder="Enter wishlist name"
                            />
                            {errors.name && <span className={styles.editWishlistModal__error}>{errors.name}</span>}
                        </div>

                        {/* Description */}
                        <div className={`${styles.editWishlistModal__field} ${styles["editWishlistModal__field--full"]}`}>
                            <label className={styles.editWishlistModal__label} htmlFor="description">
                                Description *
                            </label>
                            <textarea
                                id="description"
                                className={`${styles.editWishlistModal__textarea} ${errors.description ? styles["editWishlistModal__textarea--error"] : ""}`}
                                value={formData.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                placeholder="Describe your wishlist..."
                                rows={4}
                            />
                            {errors.description && <span className={styles.editWishlistModal__error}>{errors.description}</span>}
                        </div>

                        {/* Category */}
                        <div className={styles.editWishlistModal__field}>
                            <label className={styles.editWishlistModal__label} htmlFor="category">
                                Category
                            </label>
                            <select
                                id="category"
                                className={styles.editWishlistModal__select}
                                value={formData.category}
                                onChange={(e) => handleInputChange("category", e.target.value)}
                            >
                                <option value="general">General</option>
                                <option value="birthday">Birthday</option>
                                <option value="wedding">Wedding</option>
                                <option value="holiday">Holiday</option>
                                <option value="baby">Baby Shower</option>
                                <option value="graduation">Graduation</option>
                                <option value="home">Home & Garden</option>
                                <option value="tech">Technology</option>
                                <option value="books">Books & Media</option>
                                <option value="fashion">Fashion & Style</option>
                                <option value="travel">Travel</option>
                                <option value="hobbies">Hobbies & Crafts</option>
                            </select>
                        </div>

                        {/* Privacy Setting */}
                        <div className={styles.editWishlistModal__field}>
                            <label className={styles.editWishlistModal__label}>Privacy</label>
                            <div className={styles.editWishlistModal__radioGroup}>
                                <label className={styles.editWishlistModal__radioLabel}>
                                    <input
                                        type="radio"
                                        name="privacy"
                                        checked={!formData.isPublic}
                                        onChange={() => handleInputChange("isPublic", false)}
                                        className={styles.editWishlistModal__radio}
                                    />
                                    <span className={styles.editWishlistModal__radioText}>
                    <strong>Private</strong>
                    <small>Only you can see this wishlist</small>
                  </span>
                                </label>
                                <label className={styles.editWishlistModal__radioLabel}>
                                    <input
                                        type="radio"
                                        name="privacy"
                                        checked={formData.isPublic}
                                        onChange={() => handleInputChange("isPublic", true)}
                                        className={styles.editWishlistModal__radio}
                                    />
                                    <span className={styles.editWishlistModal__radioText}>
                    <strong>Public</strong>
                    <small>Anyone with the link can view</small>
                  </span>
                                </label>
                            </div>
                        </div>

                        {/* Cover Image */}
                        <div className={`${styles.editWishlistModal__field} ${styles["editWishlistModal__field--full"]}`}>
                            <label className={styles.editWishlistModal__label} htmlFor="coverImage">
                                Cover Image URL
                            </label>
                            <input
                                type="url"
                                id="coverImage"
                                className={`${styles.editWishlistModal__input} ${errors.coverImage ? styles["editWishlistModal__input--error"] : ""}`}
                                value={formData.coverImage}
                                onChange={(e) => handleInputChange("coverImage", e.target.value)}
                                placeholder="https://example.com/cover-image.jpg"
                            />
                            {errors.coverImage && <span className={styles.editWishlistModal__error}>{errors.coverImage}</span>}
                        </div>

                        {/* Settings Section */}
                        <div className={`${styles.editWishlistModal__field} ${styles["editWishlistModal__field--full"]}`}>
                            <label className={styles.editWishlistModal__label}>Wishlist Settings</label>
                            <div className={styles.editWishlistModal__settingsGroup}>
                                <label className={styles.editWishlistModal__checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.allowComments}
                                        onChange={(e) => handleInputChange("allowComments", e.target.checked)}
                                        className={styles.editWishlistModal__checkbox}
                                    />
                                    <span className={styles.editWishlistModal__checkboxText}>
                    <strong>Allow Comments</strong>
                    <small>Let others leave comments on your wishlist</small>
                  </span>
                                </label>

                                <label className={styles.editWishlistModal__checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.allowSuggestions}
                                        onChange={(e) => handleInputChange("allowSuggestions", e.target.checked)}
                                        className={styles.editWishlistModal__checkbox}
                                    />
                                    <span className={styles.editWishlistModal__checkboxText}>
                    <strong>Allow Suggestions</strong>
                    <small>Let others suggest items for your wishlist</small>
                  </span>
                                </label>

                                <label className={styles.editWishlistModal__checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.notifyOnPurchase}
                                        onChange={(e) => handleInputChange("notifyOnPurchase", e.target.checked)}
                                        className={styles.editWishlistModal__checkbox}
                                    />
                                    <span className={styles.editWishlistModal__checkboxText}>
                    <strong>Purchase Notifications</strong>
                    <small>Get notified when someone purchases an item</small>
                  </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className={styles.editWishlistModal__preview}>
                        <h3 className={styles.editWishlistModal__previewTitle}>Preview</h3>
                        <div className={styles.editWishlistModal__previewCard}>
                            {formData.coverImage && (
                                <div className={styles.editWishlistModal__previewImage}>
                                    <img src={formData.coverImage || "/placeholder.svg"} alt="Cover preview" />
                                </div>
                            )}
                            <div className={styles.editWishlistModal__previewContent}>
                                <div className={styles.editWishlistModal__previewHeader}>
                                    <h4 className={styles.editWishlistModal__previewName}>{formData.name || "Wishlist Name"}</h4>
                                    <div className={styles.editWishlistModal__previewBadges}>
                    <span
                        className={`${styles.editWishlistModal__previewBadge} ${formData.isPublic ? styles["editWishlistModal__previewBadge--public"] : styles["editWishlistModal__previewBadge--private"]}`}
                    >
                      {formData.isPublic ? "Public" : "Private"}
                    </span>
                                        <span className={styles.editWishlistModal__previewBadge}>{formData.category}</span>
                                    </div>
                                </div>
                                <p className={styles.editWishlistModal__previewDescription}>
                                    {formData.description || "Wishlist description"}
                                </p>
                                <div className={styles.editWishlistModal__previewSettings}>
                                    {formData.allowComments && (
                                        <span className={styles.editWishlistModal__previewSetting}>💬 Comments</span>
                                    )}
                                    {formData.allowSuggestions && (
                                        <span className={styles.editWishlistModal__previewSetting}>💡 Suggestions</span>
                                    )}
                                    {formData.notifyOnPurchase && (
                                        <span className={styles.editWishlistModal__previewSetting}>🔔 Notifications</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.editWishlistModal__actions}>
                        <button
                            type="button"
                            className={`${styles.editWishlistModal__button} ${styles["editWishlistModal__button--secondary"]}`}
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`${styles.editWishlistModal__button} ${styles["editWishlistModal__button--primary"]}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving Changes..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
