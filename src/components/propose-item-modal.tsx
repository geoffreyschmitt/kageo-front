"use client"

import type React from "react"
import { useState } from "react"
import styles from "./propose-item-modal.module.css"

interface ProposeItemFormData {
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    purchaseUrl: string
    notes: string
}

interface ProposeItemModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (itemData: ProposeItemFormData) => void
}

export default function ProposeItemModal({ isOpen, onClose, onSubmit }: ProposeItemModalProps) {
    const [formData, setFormData] = useState<ProposeItemFormData>({
        name: "",
        description: "",
        price: 0,
        currency: "$",
        imageUrl: "",
        purchaseUrl: "",
        notes: "",
    })

    const [errors, setErrors] = useState<Partial<ProposeItemFormData>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const validateForm = (): boolean => {
        const newErrors: Partial<ProposeItemFormData> = {}

        if (!formData.name.trim()) {
            newErrors.name = "Item name is required"
        }

        if (!formData.description.trim()) {
            newErrors.description = "Description is required"
        }

        if (formData.price < 0) {
            newErrors.price = "Price cannot be negative"
        }

        if (formData.purchaseUrl && !isValidUrl(formData.purchaseUrl)) {
            newErrors.purchaseUrl = "Please enter a valid URL"
        }

        if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
            newErrors.imageUrl = "Please enter a valid image URL"
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
            // Simulate API call for proposing an item
            await new Promise((resolve) => setTimeout(resolve, 1000))
            onSubmit(formData)
            handleClose()
        } catch (error) {
            console.error("Error proposing item:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setFormData({
            name: "",
            description: "",
            price: 0,
            currency: "$",
            imageUrl: "",
            purchaseUrl: "",
            notes: "",
        })
        setErrors({})
        onClose()
    }

    const handleInputChange = (field: keyof ProposeItemFormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    if (!isOpen) return null

    return (
        <div className={styles.proposeItemModal}>
            <div className={styles.proposeItemModal__overlay} onClick={handleClose} />
            <div className={styles.proposeItemModal__container}>
                <div className={styles.proposeItemModal__header}>
                    <h2 className={styles.proposeItemModal__title}>Propose New Item</h2>
                    <button className={styles.proposeItemModal__closeButton} onClick={handleClose}>
                        ×
                    </button>
                </div>

                <form className={styles.proposeItemModal__form} onSubmit={handleSubmit}>
                    <div className={styles.proposeItemModal__formGrid}>
                        {/* Item Name */}
                        <div className={styles.proposeItemModal__field}>
                            <label className={styles.proposeItemModal__label} htmlFor="name">
                                Item Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                className={`${styles.proposeItemModal__input} ${errors.name ? styles["proposeItemModal__input--error"] : ""}`}
                                value={formData.name}
                                onChange={(e) => handleInputChange("name", e.target.value)}
                                placeholder="Enter item name"
                            />
                            {errors.name && <span className={styles.proposeItemModal__error}>{errors.name}</span>}
                        </div>

                        {/* Description */}
                        <div className={`${styles.proposeItemModal__field} ${styles["proposeItemModal__field--full"]}`}>
                            <label className={styles.proposeItemModal__label} htmlFor="description">
                                Description *
                            </label>
                            <textarea
                                id="description"
                                className={`${styles.proposeItemModal__textarea} ${errors.description ? styles["proposeItemModal__textarea--error"] : ""}`}
                                value={formData.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                placeholder="Describe the item you want to propose..."
                                rows={3}
                            />
                            {errors.description && <span className={styles.proposeItemModal__error}>{errors.description}</span>}
                        </div>

                        {/* Price */}
                        <div className={styles.proposeItemModal__field}>
                            <label className={styles.proposeItemModal__label} htmlFor="price">
                                Estimated Price
                            </label>
                            <div className={styles.proposeItemModal__priceGroup}>
                                <select
                                    className={styles.proposeItemModal__currencySelect}
                                    value={formData.currency}
                                    onChange={(e) => handleInputChange("currency", e.target.value)}
                                >
                                    <option value="$">USD ($)</option>
                                    <option value="€">EUR (€)</option>
                                    <option value="£">GBP (£)</option>
                                    <option value="¥">JPY (¥)</option>
                                </select>
                                <input
                                    type="number"
                                    id="price"
                                    className={`${styles.proposeItemModal__input} ${errors.price ? styles["proposeItemModal__input--error"] : ""}`}
                                    value={formData.price || ""}
                                    onChange={(e) => handleInputChange("price", Number.parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            {errors.price && <span className={styles.proposeItemModal__error}>{errors.price}</span>}
                        </div>

                        {/* Image URL */}
                        <div className={styles.proposeItemModal__field}>
                            <label className={styles.proposeItemModal__label} htmlFor="imageUrl">
                                Image URL
                            </label>
                            <input
                                type="url"
                                id="imageUrl"
                                className={`${styles.proposeItemModal__input} ${errors.imageUrl ? styles["proposeItemModal__input--error"] : ""}`}
                                value={formData.imageUrl}
                                onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                                placeholder="https://example.com/image.jpg"
                            />
                            {errors.imageUrl && <span className={styles.proposeItemModal__error}>{errors.imageUrl}</span>}
                        </div>

                        {/* Purchase URL */}
                        <div className={`${styles.proposeItemModal__field} ${styles["proposeItemModal__field--full"]}`}>
                            <label className={styles.proposeItemModal__label} htmlFor="purchaseUrl">
                                Purchase URL
                            </label>
                            <input
                                type="url"
                                id="purchaseUrl"
                                className={`${styles.proposeItemModal__input} ${errors.purchaseUrl ? styles["proposeItemModal__input--error"] : ""}`}
                                value={formData.purchaseUrl}
                                onChange={(e) => handleInputChange("purchaseUrl", e.target.value)}
                                placeholder="https://store.com/product"
                            />
                            {errors.purchaseUrl && <span className={styles.proposeItemModal__error}>{errors.purchaseUrl}</span>}
                        </div>

                        {/* Notes */}
                        <div className={`${styles.proposeItemModal__field} ${styles["proposeItemModal__field--full"]}`}>
                            <label className={styles.proposeItemModal__label} htmlFor="notes">
                                Notes for Owner
                            </label>
                            <textarea
                                id="notes"
                                className={styles.proposeItemModal__textarea}
                                value={formData.notes}
                                onChange={(e) => handleInputChange("notes", e.target.value)}
                                placeholder="Any additional notes or reasons for proposing this item..."
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    {(formData.name || formData.imageUrl) && (
                        <div className={styles.proposeItemModal__preview}>
                            <h3 className={styles.proposeItemModal__previewTitle}>Preview of Proposed Item</h3>
                            <div className={styles.proposeItemModal__previewCard}>
                                {formData.imageUrl && (
                                    <div className={styles.proposeItemModal__previewImage}>
                                        <img src={formData.imageUrl || "/placeholder.svg"} alt="Preview" />
                                    </div>
                                )}
                                <div className={styles.proposeItemModal__previewContent}>
                                    <h4 className={styles.proposeItemModal__previewName}>{formData.name || "Item Name"}</h4>
                                    <p className={styles.proposeItemModal__previewDescription}>
                                        {formData.description || "Item description"}
                                    </p>
                                    <div className={styles.proposeItemModal__previewMeta}>
                    <span className={styles.proposeItemModal__previewPrice}>
                      {formData.currency}
                        {formData.price.toFixed(2)}
                    </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.proposeItemModal__actions}>
                        <button
                            type="button"
                            className={`${styles.proposeItemModal__button} ${styles["proposeItemModal__button--secondary"]}`}
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`${styles.proposeItemModal__button} ${styles["proposeItemModal__button--primary"]}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Proposing..." : "Propose Item"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
