
import React from "react"
import styles from "./UpdateWishlistModal.module.css"
import type { TUpdateWishlistModal } from "@/features/UpdateWishlist"
import { useEditWishlistModel } from "@/features/UpdateWishlist/model"
import {Modal} from "@/shared/ui";
import {WishlistForm} from "@/entities/wishlist/ui";
export const UpdateWishlistModal = ({ isOpen, onClose, onSubmit, initialData }: TUpdateWishlistModal) => {
    const {
        formData,
        errors,
        isSubmitting,
        handleInputChange,
        handleSubmit,
    } = useEditWishlistModel({
        onSubmit,
        onClose,
        initialData,
        useMock: true,
    })

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Modifier la Wishlist"
            className={styles.updateWishlistModal}
        >
            <WishlistForm
                formData={formData}
                errors={errors}
                isSubmitting={isSubmitting}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                onCancel={onClose}
            />
        </Modal>
    )
}