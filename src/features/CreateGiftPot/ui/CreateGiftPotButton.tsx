'use client'

import { useTranslations } from 'next-intl'
import { useCreateGiftPotModel } from '../model'
import { CreateGiftPotModal } from './CreateGiftPotModal'
import type { TCreateGiftPotButtonProps } from './CreateGiftPotModal.types'
import styles from './CreateGiftPotModal.module.css'

export const CreateGiftPotButton = ({
    wishId,
    ownerName,
    price,
    currency,
    isLoggedIn,
    isInvited,
    onPotCreated,
    useMock = false,
}: TCreateGiftPotButtonProps) => {
    const t = useTranslations('createGiftPotModal')
    const { modalState, openModal, closeModal, isCreating, error, handleConfirm } = useCreateGiftPotModel({
        wishId,
        isLoggedIn,
        isInvited,
        onPotCreated,
        useMock,
    })

    return (
        <>
            <button className={styles.createGiftPot__trigger} onClick={openModal}>
                {t('triggerLead')} <b>{t('triggerAction')}</b>
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
