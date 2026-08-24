"use client"

import { useTranslations } from 'next-intl'

import {Modal} from "@/shared/ui/Modal"
import type {TDeleteWishConfirmationModal} from "./DeleteWishConfirmationModal.types"

import styles from "./DeleteWishConfirmationModal.module.css"

export const DeleteWishConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    wishName,
}: TDeleteWishConfirmationModal) => {
    const t = useTranslations('deleteWishModal')
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('title')}
            subtitle={t('subtitle')}
        >
            <div className={styles['confirmation-modal__content']}>
                <p className={styles['confirmation-modal__message']}>
                    {t('message', {wishName})}
                </p>
                <div className={styles['confirmation-modal__actions']}>
                    <button
                        className={`${styles['confirmation-modal__button']} ${styles['confirmation-modal__button--cancel']}`}
                        onClick={onClose}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        className={`${styles['confirmation-modal__button']} ${styles['confirmation-modal__button--confirm']}`}
                        onClick={onConfirm}
                    >
                        {t('delete')}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
