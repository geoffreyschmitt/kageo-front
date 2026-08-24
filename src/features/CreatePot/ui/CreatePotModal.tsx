'use client'

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
    if (modalState === 'closed') return null

    if (modalState === 'login-required') {
        return (
            <Modal isOpen onClose={onClose} title="Start a gift pot">
                <div className={styles.createPot}>
                    <p className={styles.createPot__message}>
                        Log in to start a pot for <strong>{ownerName}</strong>. You&apos;ll also need to be
                        invited by the wishlist owner.
                    </p>
                    <div className={styles.createPot__actions}>
                        <button className={`${styles.createPot__button} ${styles['createPot__button--secondary']}`} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`${styles.createPot__button} ${styles['createPot__button--primary']}`}
                            onClick={() => eventBus.emit('auth:openLoginModal', {})}
                        >
                            Log in
                        </button>
                    </div>
                </div>
            </Modal>
        )
    }

    if (modalState === 'invite-required') {
        return (
            <Modal isOpen onClose={onClose} title="Start a gift pot">
                <div className={styles.createPot}>
                    <p className={styles.createPot__message}>
                        Only guests invited by <strong>{ownerName}</strong> can start a pot. Ask them to
                        share the wishlist with you via email.
                    </p>
                    <div className={styles.createPot__actions}>
                        <button className={`${styles.createPot__button} ${styles['createPot__button--primary']}`} onClick={onClose}>
                            Got it
                        </button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (
        <Modal isOpen onClose={onClose} title="Start a gift pot">
            <div className={styles.createPot}>
                <p className={styles.createPot__message}>
                    You&apos;ll be the organizer of a collective gift pot for <strong>{ownerName}</strong>.
                    Other guests can see that you started it and contribute anonymously.
                </p>
                {error && <p className={styles.createPot__error}>{error}</p>}
                <div className={styles.createPot__actions}>
                    <button
                        className={`${styles.createPot__button} ${styles['createPot__button--secondary']}`}
                        onClick={onClose}
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        className={`${styles.createPot__button} ${styles['createPot__button--primary']}`}
                        onClick={onConfirm}
                        disabled={isCreating}
                    >
                        {isCreating ? 'Starting\u2026' : 'Start the pot'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
