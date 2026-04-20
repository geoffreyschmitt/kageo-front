'use client'

import { Modal } from '@/shared/ui'
import { useContributePotModel } from '../model'
import type { TContributeModal } from './ContributeModal.types'
import styles from './ContributeModal.module.css'

export const ContributeModal = ({
    isOpen,
    onClose,
    wishlistId,
    eventName,
    ownerName,
    creatorName,
    totalContributed,
    userContributed = 0,
    currency,
    isLoggedIn,
    onContribute,
    onError,
    useMock = false,
}: TContributeModal) => {
    const { amount, setAmount, isSubmitting, error, handleSubmit } = useContributePotModel({
        wishlistId,
        onContribute,
        onError,
        onClose,
        useMock,
    })

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<span className={styles.contribute__modalTitle}>Gift to the pot</span>}
            subtitle={eventName}
        >
            <div className={styles.contribute}>
                <div className={styles.contribute__hero}>
                    <div className={styles.contribute__heroIcon} aria-hidden="true">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="24" cy="24" r="22" fill="#eaf2eb" stroke="#b8dbb9" strokeWidth="1.2"/>
                            <path d="M24 33 Q18 27 16 21 Q14 15 20 13 Q23 12 25 16 Q27 12 30 13 Q36 15 28 25 Q27 27 24 33Z" fill="#3f6845" opacity="0.75"/>
                            <path d="M24 33 Q24 26 24 20" stroke="#3f6845" strokeWidth="1.2" opacity="0.5" strokeLinecap="round"/>
                            <path d="M24 23 Q21 20 18 18" stroke="#3f6845" strokeWidth="1" opacity="0.4" strokeLinecap="round"/>
                            <path d="M24 27 Q27 24 30 22" stroke="#3f6845" strokeWidth="1" opacity="0.4" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div className={styles.contribute__heroText}>
                        <p className={styles.contribute__heroMessage}>
                            A collective gift for <strong>{ownerName}</strong>
                        </p>
                        <p className={styles.contribute__heroOrganizer}>
                            Organised by {creatorName}
                        </p>
                        {totalContributed > 0 ? (
                            <p className={styles.contribute__heroSub}>
                                {currency}{totalContributed.toFixed(2)} already pooled by friends
                            </p>
                        ) : (
                            <p className={styles.contribute__heroSub}>
                                Be the first to add to the pot
                            </p>
                        )}
                        {userContributed > 0 && (
                            <p className={styles.contribute__heroUserContrib}>
                                You&apos;ve gifted {currency}{userContributed.toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>

                {!isLoggedIn ? (
                    <div className={styles.contribute__loginBanner}>
                        <p className={styles.contribute__loginBannerText}>
                            Log in to contribute to this pot.
                        </p>
                        <a href="/login" className={styles.contribute__loginBannerLink}>
                            Log in
                        </a>
                    </div>
                ) : (
                    <>
                        <div className={styles.contribute__field}>
                            <label className={styles.contribute__label} htmlFor="contribute-amount">
                                Your contribution
                            </label>
                            <div className={styles.contribute__amountWrap}>
                                <span className={styles.contribute__currency}>{currency}</span>
                                <input
                                    id="contribute-amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className={`${styles.contribute__input} ${error ? styles['contribute__input--error'] : ''}`}
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                            </div>
                            {error && <p className={styles.contribute__error}>{error}</p>}
                        </div>

                        <div className={styles.contribute__actions}>
                            <button
                                className={`${styles.contribute__button} ${styles['contribute__button--secondary']}`}
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${styles.contribute__button} ${styles['contribute__button--primary']}`}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending…' : 'Send gift'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
