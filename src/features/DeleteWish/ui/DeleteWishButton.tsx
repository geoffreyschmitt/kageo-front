"use client"

import {useDeleteWishModel} from "../model"
import type {TDeleteWishButton} from "./DeleteWishButton.types"
import {DeleteWishConfirmationModal} from "./DeleteWishConfirmationModal"

import styles from "./DeleteWishButton.module.css"

export const DeleteWishButton = ({wishId, wishName, onDelete, onError}: TDeleteWishButton) => {
    const {isDeleting, error, handleDelete, isConfirmOpen, openConfirm, closeConfirm, wishName: modelWishName} = useDeleteWishModel({
        wishId,
        wishName,
        onDelete,
        onError,
    })

    return (
        <>
            <button
                className={`${styles['delete-button']}`}
                onClick={openConfirm}
                disabled={isDeleting}
            >
                {isDeleting ? "Deleting..." : "Remove"}
            </button>
            {error && (
                <span className={styles['delete-button__error']}>{error}</span>
            )}
            <DeleteWishConfirmationModal
                isOpen={isConfirmOpen}
                onClose={closeConfirm}
                onConfirm={handleDelete}
                wishName={modelWishName || wishName || "this wish"}
            />
        </>
    )
}
