'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/shared/ui'
import { eventBus } from '@/shared/eventBus'
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
    const t = useTranslations('contributeModal')
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
            title={<span className={styles.contribute__modalTitle}>{t('title')}</span>}
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
                            {t('collectiveGift', { ownerName })}
                        </p>
                        <p className={styles.contribute__heroOrganizer}>
                            {t('organisedBy', { creatorName })}
                        </p>
                        {totalContributed > 0 ? (
                            <p className={styles.contribute__heroSub}>
                                {t('alreadyPledged', { currency, amount: totalContributed.toFixed(2) })}
                            </p>
                        ) : (
                            <p className={styles.contribute__heroSub}>
                                {t('beFirst')}
                            </p>
                        )}
                        {userContributed > 0 && (
                            <p className={styles.contribute__heroUserContrib}>
                                {t('youvePledged', { currency, amount: userContributed.toFixed(2) })}
                            </p>
                        )}
                    </div>
                </div>

                {!isLoggedIn ? (
                    <div className={styles.contribute__loginBanner}>
                        <p className={styles.contribute__loginBannerText}>
                            {t('loginPrompt')}
                        </p>
                        <button
                            type="button"
                            className={styles.contribute__loginBannerLink}
                            onClick={() => eventBus.emit('auth:openLoginModal', {})}
                        >
                            {t('logIn')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={styles.contribute__field}>
                            <label className={styles.contribute__label} htmlFor="contribute-amount">
                                {t('contributionLabel')}
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
                            <p className={styles.contribute__disclaimer}>
                                {t('disclaimer', { creatorName })}
                            </p>
                        </div>

                        <div className={styles.contribute__actions}>
                            <button
                                className={`${styles.contribute__button} ${styles['contribute__button--secondary']}`}
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                className={`${styles.contribute__button} ${styles['contribute__button--primary']}`}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? t('adding') : t('addPledge')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
