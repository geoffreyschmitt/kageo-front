'use client'

import { useTranslations } from 'next-intl'

import { useCreatePotModel } from '../model'

import { CreatePotModal } from './CreatePotModal'
import styles from './CreatePotModal.module.css'
import type { TCreatePotButtonProps } from './CreatePotModal.types'

export const CreatePotButton = ({
    wishlistId,
    ownerName,
    isLoggedIn,
    isInvited,
    onPotCreated,
}: TCreatePotButtonProps) => {
    const t = useTranslations('createPotModal')
    const { modalState, openModal, closeModal, isCreating, error, handleConfirm } = useCreatePotModel({
        wishlistId,
        isLoggedIn,
        isInvited,
        onPotCreated,
    })

    return (
        <>
            <button className={styles.createPot__triggerButton} onClick={openModal}>
                {t('triggerButton')}
            </button>
            <CreatePotModal
                modalState={modalState}
                ownerName={ownerName}
                isCreating={isCreating}
                error={error}
                onClose={closeModal}
                onConfirm={handleConfirm}
            />
        </>
    )
}
