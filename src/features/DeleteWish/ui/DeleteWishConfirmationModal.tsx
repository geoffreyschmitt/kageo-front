"use client"

import {Modal} from "@/shared/ui/Modal"
import type {TDeleteWishConfirmationModal} from "./DeleteWishConfirmationModal.types"

import styles from "./DeleteWishConfirmationModal.module.css"

export const DeleteWishConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    wishName,
}: TDeleteWishConfirmationModal) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Wish"
            subtitle="This action cannot be undone"
        >
            <div className={styles['confirmation-modal__content']}>
                <p className={styles['confirmation-modal__message']}>
                    Are you sure you want to delete <span className={styles['confirmation-modal__wish-name']}>{wishName}</span>? This action cannot be undone.
                </p>
                <div className={styles['confirmation-modal__actions']}>
                    <button
                        className={`${styles['confirmation-modal__button']} ${styles['confirmation-modal__button--cancel']}`}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className={`${styles['confirmation-modal__button']} ${styles['confirmation-modal__button--confirm']}`}
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </Modal>
    )
}
