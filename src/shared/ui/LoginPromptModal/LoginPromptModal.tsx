'use client'

import { useTranslations } from 'next-intl'

import { Modal } from '@/shared/ui/Modal'
import { eventBus } from '@/shared/eventBus'

import styles from './LoginPromptModal.module.css'

type TLoginPromptModalProps = {
    isOpen: boolean
    onClose: () => void
    message: string
    title?: string
}

export const LoginPromptModal = ({ isOpen, onClose, message, title }: TLoginPromptModalProps) => {
    const t = useTranslations('loginPrompt')

    if (!isOpen) return null

    return (
        <Modal isOpen onClose={onClose} title={title ?? t('title')}>
            <div className={styles.loginPrompt}>
                <p className={styles.loginPrompt__message}>{message}</p>
                <div className={styles.loginPrompt__actions}>
                    <button
                        className={`${styles.loginPrompt__button} ${styles['loginPrompt__button--secondary']}`}
                        onClick={onClose}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.loginPrompt__button} ${styles['loginPrompt__button--primary']}`}
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
