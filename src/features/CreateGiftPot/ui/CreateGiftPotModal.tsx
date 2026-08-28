'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/shared/ui'
import { eventBus } from '@/shared/eventBus'
import type { TCreateGiftPotModalProps } from './CreateGiftPotModal.types'
import styles from './CreateGiftPotModal.module.css'

export const CreateGiftPotModal = ({
    modalState,
    ownerName,
    price,
    currency,
    isCreating,
    error,
    onClose,
    onConfirm,
}: TCreateGiftPotModalProps) => {
    const t = useTranslations('createGiftPotModal')

    if (modalState === 'closed') return null

    if (modalState === 'login-required') {
        return (
            <Modal isOpen onClose={onClose} title={t('title')}>
                <div className={styles.createGiftPot}>
                    <p className={styles.createGiftPot__message}>
                        {t('loginRequired', { ownerName })}
                    </p>
                    <div className={styles.createGiftPot__actions}>
                        <button className={`${styles.createGiftPot__button} ${styles['createGiftPot__button--secondary']}`} onClick={onClose}>
                            {t('cancel')}
                        </button>
                        <button
                            type="button"
                            className={`${styles.createGiftPot__button} ${styles['createGiftPot__button--primary']}`}
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
                <div className={styles.createGiftPot}>
                    <p className={styles.createGiftPot__message}>
                        {t('inviteRequired', { ownerName })}
                    </p>
                    <div className={styles.createGiftPot__actions}>
                        <button className={`${styles.createGiftPot__button} ${styles['createGiftPot__button--primary']}`} onClick={onClose}>
                            {t('gotIt')}
                        </button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (
        <Modal isOpen onClose={onClose} title={t('title')}>
            <div className={styles.createGiftPot}>
                <div className={styles.createGiftPot__goal}>
                    <span className={styles.createGiftPot__goalLabel}>{t('goalLabel')}</span>
                    <span className={styles.createGiftPot__goalValue}>
                        {currency}{price.toFixed(2)}
                    </span>
                </div>
                <p className={styles.createGiftPot__hint}>{t('goalHint')}</p>
                <p className={styles.createGiftPot__message}>{t('note')}</p>
                {error && <p className={styles.createGiftPot__error}>{error}</p>}
                <div className={styles.createGiftPot__actions}>
                    <button
                        className={`${styles.createGiftPot__button} ${styles['createGiftPot__button--secondary']}`}
                        onClick={onClose}
                        disabled={isCreating}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        className={`${styles.createGiftPot__button} ${styles['createGiftPot__button--primary']}`}
                        onClick={onConfirm}
                        disabled={isCreating}
                    >
                        {isCreating ? t('starting') : t('start')}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
