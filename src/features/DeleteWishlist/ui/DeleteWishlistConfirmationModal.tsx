'use client'

import { useTranslations } from 'next-intl'

import { Modal } from '@/shared/ui/Modal'
import type { TDeleteWishlistConfirmationModal } from './DeleteWishlistConfirmationModal.types'

import styles from './DeleteWishlistConfirmationModal.module.css'

export const DeleteWishlistConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    wishlistName,
}: TDeleteWishlistConfirmationModal) => {
    const t = useTranslations('deleteWishlistModal')
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('title')}
            subtitle={t('subtitle')}
        >
            <div className={styles['confirmation-modal__content']}>
                <p className={styles['confirmation-modal__message']}>
                    {t('message', { wishlistName })}
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
