'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/shared/ui'
import { eventBus } from '@/shared/eventBus'
import type { TCreatePotModalState } from './CreatePotModal.types'
import styles from './CreatePotModal.module.css'

type TCreatePotModalProps = {
    modalState: TCreatePotModalState
    ownerName: string
    isCreating: boolean
    error: string | null
    onClose: () => void
    onConfirm: () => void
}

export const CreatePotModal = ({
    modalState,
    ownerName,
    isCreating,
    error,
    onClose,
    onConfirm,
}: TCreatePotModalProps) => {
    const t = useTranslations('createPotModal')

    if (modalState === 'closed') return null

    if (modalState === 'login-required') {
        return (
            <Modal isOpen onClose={onClose} title={t('title')}>
                <div className={styles.createPot}>
                    <p className={styles.createPot__message}>
                        {t('loginRequired', { ownerName })}
                    </p>
                    <div className={styles.createPot__actions}>
                        <button className={`${styles.createPot__button} ${styles['createPot__button--secondary']}`} onClick={onClose}>
                            {t('cancel')}
                        </button>
                        <button
                            type="button"
                            className={`${styles.createPot__button} ${styles['createPot__button--primary']}`}
                            onClick={() => {
                                onClose()
                                eventBus.emit('auth:openLoginModal', {})
                            }}
                        >
                            {t('logIn')}
                        </button>
                    </div>
                </div>
            </Modal>
        )
    }

    if (modalState === 'invite-required') {
        return (
            <Modal isOpen onClose={onClose} title={t('title')}>
                <div className={styles.createPot}>
                    <p className={styles.createPot__message}>
                        {t('inviteRequired', { ownerName })}
                    </p>
                    <div className={styles.createPot__actions}>
                        <button className={`${styles.createPot__button} ${styles['createPot__button--primary']}`} onClick={onClose}>
                            {t('gotIt')}
                        </button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (
        <Modal isOpen onClose={onClose} title={t('title')}>
            <div className={styles.createPot}>
                <p className={styles.createPot__message}>
                    {t('confirmMessage', { ownerName })}
                </p>
                {error && <p className={styles.createPot__error}>{error}</p>}
                <div className={styles.createPot__actions}>
                    <button
                        className={`${styles.createPot__button} ${styles['createPot__button--secondary']}`}
                        onClick={onClose}
                        disabled={isCreating}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        className={`${styles.createPot__button} ${styles['createPot__button--primary']}`}
                        onClick={onConfirm}
                        disabled={isCreating}
                    >
                        {isCreating ? t('starting') : t('startThePot')}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
