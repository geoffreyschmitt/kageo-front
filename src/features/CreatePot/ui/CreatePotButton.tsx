'use client'

import { useTranslations } from 'next-intl'
import { useCreatePotModel } from '../model'
import { CreatePotModal } from './CreatePotModal'
import type { TCreatePotButtonProps } from './CreatePotModal.types'
import styles from './CreatePotModal.module.css'

export const CreatePotButton = ({
    wishlistId,
    ownerName,
    isLoggedIn,
    isInvited,
    onPotCreated,
    useMock = false,
}: TCreatePotButtonProps) => {
    const t = useTranslations('createPotModal')
    const { modalState, openModal, closeModal, isCreating, error, handleConfirm } = useCreatePotModel({
        wishlistId,
        isLoggedIn,
        isInvited,
        onPotCreated,
        useMock,
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
