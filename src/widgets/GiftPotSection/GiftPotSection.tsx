'use client'

import { useLocale, useTranslations } from 'next-intl'

import { ContributeGiftPotModal } from '@/features/ContributeGiftPot'
import { CreateGiftPotButton } from '@/features/CreateGiftPot'
import { useMarkPurchasedWishModel } from '@/features/markPurchasedWish'
import { eventBus } from '@/shared/eventBus'
import { formatDate } from '@/shared/lib/formatDate'

import { GIFT_POT_LIST_SCROLL_THRESHOLD, useGiftPotSectionModel } from './model'
import type { TGiftPotSectionProps } from './GiftPotSection.types'
import styles from './GiftPotSection.module.css'

const GiftIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M5 12v8h14v-8M12 8v12" />
        <path d="M12 8S9.5 3.5 7 5.5 12 8 12 8zM12 8s2.5-4.5 5-2.5S12 8 12 8z" />
    </svg>
)

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
)

const ChevronIcon = () => (
    <svg className={styles.giftPot__chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
    </svg>
)

const LockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
)

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'

export const GiftPotSection = ({
    wishId,
    price,
    currency,
    status,
    eventName,
    ownerName,
    isLoggedIn,
    isInvited,
    userId,
    giftPot,
    onGiftPotCreated,
    onContributeGiftPot,
    onContributeGiftPotError,
    onGiftPotRemoved,
    onGiftPotRefreshed,
    onMarkPurchased,
    onMarkPurchasedError,
    useMock = false,
}: TGiftPotSectionProps) => {
    const t = useTranslations('giftPot')
    const locale = useLocale()
    const model = useGiftPotSectionModel({ wishId, onGiftPotRefreshed, useMock })
    // The feature's own button hard-codes an English caption, so we drive its
    // hook directly and render a translated button below.
    const mark = useMarkPurchasedWishModel({
        wishId,
        userId: userId ?? '',
        onMarkPurchased,
        onError: onMarkPurchasedError,
        useMock,
    })

    const fmt = (n: number) => `${currency}${Number.isInteger(n) ? n : n.toFixed(2)}`

    // ── No pot yet ────────────────────────────────────────────
    if (!giftPot) {
        const isEligible = price > 0 && status === 'wanted'
        if (!isEligible) return null

        return (
            <div className={styles.giftPot__create}>
                <CreateGiftPotButton
                    wishId={wishId}
                    ownerName={ownerName}
                    price={price}
                    currency={currency}
                    isLoggedIn={isLoggedIn}
                    isInvited={isInvited}
                    onPotCreated={(creatorId, creatorName) => onGiftPotCreated(wishId, creatorId, creatorName)}
                    useMock={useMock}
                />
            </div>
        )
    }

    const goal = giftPot.goal
    const total = giftPot.totalContributed
    const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0
    const myPledge = giftPot.myContribution ?? 0
    const participantCount = giftPot.participantCount ?? 0
    const isCreator = giftPot.isCreator === true
    const isFunded = giftPot.isFunded === true
    const contributors = giftPot.contributors ?? []

    // ── Shared pieces ─────────────────────────────────────────
    const progress = (
        <>
            <div
                className={styles.giftPot__bar}
                role="progressbar"
                aria-label={t('pledgedTotal')}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <i style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.giftPot__amounts}>
                <div>
                    <span className={styles.giftPot__big}>{fmt(total)}</span>
                    <span className={styles.giftPot__goalInline}>{t('outOf', { amount: fmt(goal) })}</span>
                </div>
                {isCreator ? (
                    <span className={styles.giftPot__chip}>{t('startedByYou')}</span>
                ) : (
                    <span className={styles.giftPot__people}>{t('participants', { count: participantCount })}</span>
                )}
            </div>
        </>
    )

    const fundedBlock = (
        <div className={styles.giftPot__done}>
            <GiftIcon />
            <p>{t('fundedBody', { creatorName: giftPot.creatorName })}</p>
        </div>
    )

    // The pledge control every logged-in viewer gets, organiser included.
    // Editing stays available once the pot is funded — a wrong amount has to
    // stay correctable — but a fresh pledge does not.
    const pledgeControl =
        myPledge > 0 ? (
            <div className={styles.giftPot__mine}>
                <div>
                    <p className={styles.giftPot__mineLabel}>{t('yourPledge')}</p>
                    <span className={styles.giftPot__mineAmount}>{fmt(myPledge)}</span>
                </div>
                <button className={styles.giftPot__mineLink} type="button" onClick={model.openEdit}>
                    {t('modify')}
                </button>
            </div>
        ) : isFunded ? null : (
            <button className={styles.giftPot__button} type="button" onClick={model.openAdd}>
                {t('contribute')}
            </button>
        )

    const note = (text: string) => (
        <p className={styles.giftPot__note}>
            <LockIcon />
            <span>{text}</span>
        </p>
    )

    const modalEl = model.modal && (
        <ContributeGiftPotModal
            isOpen
            onClose={model.closeModal}
            wishId={wishId}
            eventName={eventName}
            ownerName={ownerName}
            creatorName={giftPot.creatorName}
            goal={goal}
            totalContributed={total}
            userContributed={myPledge}
            currency={currency}
            isLoggedIn={isLoggedIn}
            mode={model.modal}
            initialAmount={model.modal === 'edit' ? myPledge : 0}
            onContribute={(_wishId, delta) => onContributeGiftPot(wishId, delta)}
            onError={(_wishId, delta) => onContributeGiftPotError(wishId, delta)}
            onRemove={(_wishId, removedAmount) => onGiftPotRemoved(wishId, removedAmount)}
            onSaved={model.reconcile}
            useMock={useMock}
        />
    )

    // ── Panel body by role ────────────────────────────────────
    const body = () => {
        // Logged out — the totals stay generic, the details do not.
        if (!isLoggedIn) {
            return (
                <>
                    {progress}
                    <p className={styles.giftPot__org}>{t('loginToSee')}</p>
                    <button
                        className={styles.giftPot__button}
                        type="button"
                        onClick={() => eventBus.emit('auth:openLoginModal', {})}
                    >
                        {t('contribute')}
                    </button>
                </>
            )
        }

        // Organiser — the only role that sees names and amounts.
        if (isCreator) {
            const isScrollable = contributors.length > GIFT_POT_LIST_SCROLL_THRESHOLD
            return (
                <>
                    {progress}

                    <div className={styles.giftPot__goalRow}>
                        <span className={styles.giftPot__goalKey}>{t('goal')}</span>
                        <span className={styles.giftPot__goalValue}>{fmt(goal)}</span>
                    </div>

                    {pledgeControl}

                    {contributors.length > 0 && (
                        <>
                            <p className={styles.giftPot__listHead}>{t('participants', { count: participantCount })}</p>
                            <div
                                className={`${styles.giftPot__listWrap} ${isScrollable ? styles['giftPot__listWrap--scroll'] : ''}`}
                            >
                                <ul className={styles.giftPot__list}>
                                    {contributors.map((c, i) => (
                                        <li className={styles.giftPot__row} key={`${c.name}-${i}`}>
                                            <span className={styles.giftPot__avatar}>{initials(c.name)}</span>
                                            <p className={styles.giftPot__name}>
                                                {c.name}
                                                {c.name === giftPot.creatorName && (
                                                    <span className={styles.giftPot__tag}>{t('you')}</span>
                                                )}
                                                {c.lastContributedAt && (
                                                    <small>{t('pledgedOn', { date: formatDate(c.lastContributedAt, locale) })}</small>
                                                )}
                                            </p>
                                            <span className={styles.giftPot__rowAmount}>{fmt(c.amount)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}

                    {isFunded && (
                        <>
                            {fundedBlock}
                            {userId && (
                                <div className={styles.giftPot__buy}>
                                    <button
                                        className={styles.giftPot__button}
                                        type="button"
                                        onClick={mark.handleMarkPurchased}
                                        disabled={mark.isMarking}
                                    >
                                        {t('markPurchased')}
                                    </button>
                                    <p className={styles.giftPot__buyHint}>{t('markPurchasedHint')}</p>
                                </div>
                            )}
                        </>
                    )}

                    {note(t('noteOrganizer'))}
                </>
            )
        }

        // Guest — funded swaps the "organised by" line for the closing copy and
        // drops the note, but a pledge already made stays editable.
        const othersCount = Math.max(0, participantCount - 1)
        return (
            <>
                {progress}
                {isFunded ? (
                    fundedBlock
                ) : (
                    <p className={styles.giftPot__org}>{t('organisedBy', { creatorName: giftPot.creatorName })}</p>
                )}
                {pledgeControl}
                {myPledge > 0 && othersCount > 0 && (
                    <p className={styles.giftPot__others}>
                        {t('otherParticipants', { count: othersCount })} &middot; {t('pledgesHidden')}
                    </p>
                )}
                {!isFunded && note(t('noteGuest', { creatorName: giftPot.creatorName }))}
            </>
        )
    }

    return (
        <div className={styles.giftPot}>
            <details className={styles.giftPot__details}>
                <summary className={styles.giftPot__summary}>
                    <span className={styles.giftPot__label}>
                        {isFunded ? <CheckIcon /> : <GiftIcon />}
                        {isFunded ? t('funded') : t('kicker')}
                    </span>
                    {myPledge > 0 && (
                        <span className={styles.giftPot__you}>
                            {t('you')}&nbsp;: {fmt(myPledge)}
                        </span>
                    )}
                    <span className={styles.giftPot__mini}>
                        <span className={styles.giftPot__miniBar}>
                            <i style={{ width: `${pct}%` }} />
                        </span>
                        <span className={styles.giftPot__pct}>{pct}%</span>
                    </span>
                    <ChevronIcon />
                </summary>
                <div className={styles.giftPot__panel}>{body()}</div>
            </details>
            {modalEl}
        </div>
    )
}
