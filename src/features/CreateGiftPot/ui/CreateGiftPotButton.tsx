'use client'

import { useTranslations } from 'next-intl'

import { useCreateGiftPotModel } from '../model'

import { CreateGiftPotModal } from './CreateGiftPotModal'
import styles from './CreateGiftPotModal.module.css'
import type { TCreateGiftPotButtonProps } from './CreateGiftPotModal.types'

export const CreateGiftPotButton = ({
    wishId,
    ownerName,
    price,
    currency,
    isLoggedIn,
    isInvited,
    onPotCreated,
}: TCreateGiftPotButtonProps) => {
    const t = useTranslations('createGiftPotModal')
    const { modalState, openModal, closeModal, isCreating, error, handleConfirm } = useCreateGiftPotModel({
        wishId,
        isLoggedIn,
        isInvited,
        onPotCreated,
    })

    return (
        <>
            <button type="button" className={styles.createGiftPot__trigger} onClick={openModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="8" width="18" height="4" rx="1" />
                    <path d="M5 12v8h14v-8M12 8v12" />
                    <path d="M12 8S9.5 3.5 7 5.5 12 8 12 8zM12 8s2.5-4.5 5-2.5S12 8 12 8z" />
                </svg>
                {t('trigger')}
            </button>
            <CreateGiftPotModal
                modalState={modalState}
                ownerName={ownerName}
                price={price}
                currency={currency}
                isCreating={isCreating}
                error={error}
                onClose={closeModal}
                onConfirm={handleConfirm}
            />
        </>
    )
}
