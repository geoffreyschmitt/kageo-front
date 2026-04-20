'use client'

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
                Start a gift pot
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
