'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/shared/ui'
import { eventBus } from '@/shared/eventBus'
import { useContributeGiftPotModel } from '../model'
import type { TContributeGiftPotModal } from './ContributeGiftPotModal.types'
import styles from './ContributeGiftPotModal.module.css'

const QUICK_PICKS = [20, 50, 100]

export const ContributeGiftPotModal = ({
    isOpen,
    onClose,
    wishId,
    eventName,
    ownerName,
    creatorName,
    goal,
    totalContributed,
    currency,
    isLoggedIn,
    onContribute,
    onError,
    onRemove,
    onSaved,
    useMock = false,
    mode = 'add',
    initialAmount = 0,
}: TContributeGiftPotModal) => {
    const t = useTranslations('contributeGiftPotModal')
    const isEdit = mode === 'edit'
    const [confirmingRemove, setConfirmingRemove] = useState(false)
    const { amount, setAmount, isSubmitting, error, handleSubmit, handleCancel } = useContributeGiftPotModel({
        wishId,
        onContribute,
        onError,
        onRemove,
        onSaved,
        onClose,
        useMock,
        mode,
        initialAmount,
    })

    const pct = goal > 0 ? Math.min(100, Math.round((totalContributed / goal) * 100)) : 0

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<span className={styles.contributeGiftPot__modalTitle}>{isEdit ? t('editTitle') : t('title')}</span>}
            subtitle={eventName}
        >
            <div className={styles.contributeGiftPot}>
                <div className={styles.contributeGiftPot__hero}>
                    <div className={styles.contributeGiftPot__heroIcon} aria-hidden="true">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="24" cy="24" r="22" fill="#eaf2eb" stroke="#b8dbb9" strokeWidth="1.2"/>
                            <path d="M24 33 Q18 27 16 21 Q14 15 20 13 Q23 12 25 16 Q27 12 30 13 Q36 15 28 25 Q27 27 24 33Z" fill="#3f6845" opacity="0.75"/>
                            <path d="M24 33 Q24 26 24 20" stroke="#3f6845" strokeWidth="1.2" opacity="0.5" strokeLinecap="round"/>
                            <path d="M24 23 Q21 20 18 18" stroke="#3f6845" strokeWidth="1" opacity="0.4" strokeLinecap="round"/>
                            <path d="M24 27 Q27 24 30 22" stroke="#3f6845" strokeWidth="1" opacity="0.4" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div className={styles.contributeGiftPot__heroText}>
                        <p className={styles.contributeGiftPot__heroMessage}>
                            {t('collectiveGift', { ownerName })}
                        </p>
                        <p className={styles.contributeGiftPot__heroOrganizer}>
                            {t('organisedBy', { creatorName })}
                        </p>
                        <div className={styles.contributeGiftPot__bar} aria-hidden="true">
                            <div className={styles.contributeGiftPot__barFill} style={{ width: `${pct}%` }} />
                        </div>
                        <p className={styles.contributeGiftPot__heroSub}>
                            {t('raised', {
                                currency,
                                total: totalContributed.toFixed(2),
                                goal: goal.toFixed(2),
                            })}
                        </p>
                    </div>
                </div>

                {!isLoggedIn ? (
                    <div className={styles.contributeGiftPot__loginBanner}>
                        <p className={styles.contributeGiftPot__loginBannerText}>
                            {t('loginPrompt')}
                        </p>
                        <button
                            type="button"
                            className={styles.contributeGiftPot__loginBannerLink}
                            onClick={() => {
                                onClose()
                                eventBus.emit('auth:openLoginModal', {})
                            }}
                        >
                            {t('logIn')}
                        </button>
                    </div>
                ) : confirmingRemove ? (
                    <div className={styles.contributeGiftPot__confirm}>
                        <p className={styles.contributeGiftPot__confirmTitle}>{t('removeConfirmTitle')}</p>
                        <p className={styles.contributeGiftPot__confirmBody}>
                            {t('removeConfirmBody', { currency, amount: initialAmount.toFixed(2) })}
                        </p>
                        <div className={styles.contributeGiftPot__actions}>
                            <button
                                type="button"
                                className={`${styles.contributeGiftPot__button} ${styles['contributeGiftPot__button--secondary']}`}
                                onClick={() => setConfirmingRemove(false)}
                                disabled={isSubmitting}
                            >
                                {t('removeKeep')}
                            </button>
                            <button
                                type="button"
                                className={`${styles.contributeGiftPot__button} ${styles['contributeGiftPot__button--danger']}`}
                                onClick={handleCancel}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? t('removing') : t('removeConfirm')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={styles.contributeGiftPot__field}>
                            <label className={styles.contributeGiftPot__label} htmlFor="contribute-gift-amount">
                                {t('contributionLabel')}
                            </label>
                            <div className={styles.contributeGiftPot__amountWrap}>
                                <span className={styles.contributeGiftPot__currency}>{currency}</span>
                                <input
                                    id="contribute-gift-amount"
                                    type="number"
                                    min={isEdit ? '0' : '0.01'}
                                    step="0.01"
                                    className={`${styles.contributeGiftPot__input} ${error ? styles['contributeGiftPot__input--error'] : ''}`}
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                            </div>
                            <div className={styles.contributeGiftPot__chips}>
                                {QUICK_PICKS.map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        className={`${styles.contributeGiftPot__chip} ${
                                            amount === String(n) ? styles['contributeGiftPot__chip--active'] : ''
                                        }`}
                                        onClick={() => setAmount(String(n))}
                                        disabled={isSubmitting}
                                    >
                                        {currency}{n}
                                    </button>
                                ))}
                            </div>
                            {error && <p className={styles.contributeGiftPot__error}>{error}</p>}
                            <p className={styles.contributeGiftPot__disclaimer}>
                                {t('disclaimer', { creatorName })}
                            </p>
                        </div>

                        <div className={styles.contributeGiftPot__actions}>
                            {isEdit && initialAmount > 0 && (
                                <button
                                    type="button"
                                    className={styles.contributeGiftPot__remove}
                                    onClick={() => setConfirmingRemove(true)}
                                    disabled={isSubmitting}
                                >
                                    {t('removePledge')}
                                </button>
                            )}
                            <button
                                className={`${styles.contributeGiftPot__button} ${styles['contributeGiftPot__button--secondary']}`}
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                className={`${styles.contributeGiftPot__button} ${styles['contributeGiftPot__button--primary']}`}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isEdit
                                    ? (isSubmitting ? t('saving') : t('savePledge'))
                                    : (isSubmitting ? t('adding') : t('addPledge'))}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
