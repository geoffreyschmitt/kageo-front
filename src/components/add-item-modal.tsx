"use client"

import type React from "react"

import { useState } from "react"
import styles from "./add-item-modal.module.css"

interface AddItemFormData {
  name: string
  description: string
  price: number
  currency: string
  imageUrl: string
  priority: "low" | "medium" | "high"
  purchaseUrl: string
  notes: string
}

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (itemData: AddItemFormData) => void
}

export default function AddItemModal({ isOpen, onClose, onSubmit }: AddItemModalProps) {
  const [formData, setFormData] = useState<AddItemFormData>({
    name: "",
    description: "",
    price: 0,
    currency: "$",
    imageUrl: "",
    priority: "medium",
    purchaseUrl: "",
    notes: "",
  })

  const [errors, setErrors] = useState<Partial<AddItemFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Partial<AddItemFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Item name is required"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    if (formData.price <= 0) {
      newErrors.price = "Price must be greater than 0"
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      onSubmit(formData)
      handleClose()
    } catch (error) {
      console.error("Error adding item:", error)
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
      priority: "medium",
      purchaseUrl: "",
      notes: "",
    })
    setErrors({})
    onClose()
  }

  const handleInputChange = (field: keyof AddItemFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.addItemModal}>
      <div className={styles.addItemModal__overlay} onClick={handleClose} />
      <div className={styles.addItemModal__container}>
        <div className={styles.addItemModal__header}>
          <h2 className={styles.addItemModal__title}>Add New Item</h2>
          <button className={styles.addItemModal__closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <form className={styles.addItemModal__form} onSubmit={handleSubmit}>
          <div className={styles.addItemModal__formGrid}>
            {/* Item Name */}
            <div className={styles.addItemModal__field}>
              <label className={styles.addItemModal__label} htmlFor="name">
                Item Name *
              </label>
              <input
                type="text"
                id="name"
                className={`${styles.addItemModal__input} ${errors.name ? styles["addItemModal__input--error"] : ""}`}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter item name"
              />
              {errors.name && <span className={styles.addItemModal__error}>{errors.name}</span>}
            </div>

            {/* Priority */}
            <div className={styles.addItemModal__field}>
              <label className={styles.addItemModal__label} htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                className={styles.addItemModal__select}
                value={formData.priority}
                onChange={(e) => handleInputChange("priority", e.target.value)}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            {/* Description */}
            <div className={`${styles.addItemModal__field} ${styles["addItemModal__field--full"]}`}>
              <label className={styles.addItemModal__label} htmlFor="description">
                Description *
              </label>
              <textarea
                id="description"
                className={`${styles.addItemModal__textarea} ${errors.description ? styles["addItemModal__textarea--error"] : ""}`}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the item you want..."
                rows={3}
              />
              {errors.description && <span className={styles.addItemModal__error}>{errors.description}</span>}
            </div>

            {/* Price */}
            <div className={styles.addItemModal__field}>
              <label className={styles.addItemModal__label} htmlFor="price">
                Price *
              </label>
              <div className={styles.addItemModal__priceGroup}>
                <select
                  className={styles.addItemModal__currencySelect}
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
                  className={`${styles.addItemModal__input} ${errors.price ? styles["addItemModal__input--error"] : ""}`}
                  value={formData.price || ""}
                  onChange={(e) => handleInputChange("price", Number.parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.price && <span className={styles.addItemModal__error}>{errors.price}</span>}
            </div>

            {/* Image URL */}
            <div className={styles.addItemModal__field}>
              <label className={styles.addItemModal__label} htmlFor="imageUrl">
                Image URL
              </label>
              <input
                type="url"
                id="imageUrl"
                className={`${styles.addItemModal__input} ${errors.imageUrl ? styles["addItemModal__input--error"] : ""}`}
                value={formData.imageUrl}
                onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              {errors.imageUrl && <span className={styles.addItemModal__error}>{errors.imageUrl}</span>}
            </div>

            {/* Purchase URL */}
            <div className={`${styles.addItemModal__field} ${styles["addItemModal__field--full"]}`}>
              <label className={styles.addItemModal__label} htmlFor="purchaseUrl">
                Purchase URL
              </label>
              <input
                type="url"
                id="purchaseUrl"
                className={`${styles.addItemModal__input} ${errors.purchaseUrl ? styles["addItemModal__input--error"] : ""}`}
                value={formData.purchaseUrl}
                onChange={(e) => handleInputChange("purchaseUrl", e.target.value)}
                placeholder="https://store.com/product"
              />
              {errors.purchaseUrl && <span className={styles.addItemModal__error}>{errors.purchaseUrl}</span>}
            </div>

            {/* Notes */}
            <div className={`${styles.addItemModal__field} ${styles["addItemModal__field--full"]}`}>
              <label className={styles.addItemModal__label} htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                className={styles.addItemModal__textarea}
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any additional notes or preferences..."
                rows={2}
              />
            </div>
          </div>

          {/* Preview */}
          {(formData.name || formData.imageUrl) && (
            <div className={styles.addItemModal__preview}>
              <h3 className={styles.addItemModal__previewTitle}>Preview</h3>
              <div className={styles.addItemModal__previewCard}>
                {formData.imageUrl && (
                  <div className={styles.addItemModal__previewImage}>
                    <img src={formData.imageUrl || "/placeholder.svg"} alt="Preview" />
                  </div>
                )}
                <div className={styles.addItemModal__previewContent}>
                  <h4 className={styles.addItemModal__previewName}>{formData.name || "Item Name"}</h4>
                  <p className={styles.addItemModal__previewDescription}>
                    {formData.description || "Item description"}
                  </p>
                  <div className={styles.addItemModal__previewMeta}>
                    <span className={styles.addItemModal__previewPrice}>
                      {formData.currency}
                      {formData.price.toFixed(2)}
                    </span>
                    <span
                      className={`${styles.addItemModal__previewPriority} ${styles[`addItemModal__previewPriority--${formData.priority}`]}`}
                    >
                      {formData.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.addItemModal__actions}>
            <button
              type="button"
              className={`${styles.addItemModal__button} ${styles["addItemModal__button--secondary"]}`}
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.addItemModal__button} ${styles["addItemModal__button--primary"]}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding Item..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
