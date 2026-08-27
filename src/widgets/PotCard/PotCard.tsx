'use client'

import { useLocale, useTranslations } from 'next-intl'

import { ContributeModal } from '@/features/ContributePot'
import { CreatePotButton } from '@/features/CreatePot'
import { formatDate } from '@/shared/lib/formatDate'

import { usePotCardModel } from './model'
import type { TPotCardProps } from './PotCard.types'
import styles from './PotCard.module.css'

const GiftIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M5 12v8h14v-8M12 8v12" />
        <path d="M12 8S9.5 3.5 7 5.5 12 8 12 8zM12 8s2.5-4.5 5-2.5S12 8 12 8z" />
    </svg>
)

const LockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
)

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
    </svg>
)

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'

export const PotCard = ({
    wishlistId,
    eventName,
    ownerName,
    currency,
    isLoggedIn,
    isInvited,
    pot,
    onContribute,
    onContributeError,
    onContributeRemoved,
    onPotCreated,
    onPotRefreshed,
    onRequireLogin,
    useMock = false,
}: TPotCardProps) => {
    const t = useTranslations('potCard')
    const locale = useLocale()
    const model = usePotCardModel({ wishlistId, pot, onPotRefreshed, useMock })

    const fmt = (n: number) => `${currency}${n.toFixed(2)}`

    // ── No pot yet ────────────────────────────────────────────
    if (!pot) {
        return (
            <div className={styles.potCard}>
                <div className={styles.potCard__banner}>
                    <div className={styles.potCard__brand}>
                        <span className={styles.potCard__brandIcon}><GiftIcon /></span>
                        <div className={styles.potCard__bannerText}>
                            <p className={styles.potCard__bannerTitle}>{t('kicker')}</p>
                            <p className={styles.potCard__bannerSub}>{t('notStarted', { ownerName })}</p>
                        </div>
                    </div>
                    <CreatePotButton
                        wishlistId={wishlistId}
                        ownerName={ownerName}
                        isLoggedIn={isLoggedIn}
                        isInvited={isInvited}
                        onPotCreated={(creatorId, creatorName) => {
                            onPotCreated?.(creatorId, creatorName)
                            model.reconcile()
                        }}
                        useMock={useMock}
                    />
                </div>
            </div>
        )
    }

    // ── Pot exists, viewer logged out ─────────────────────────
    if (!isLoggedIn) {
        return (
            <div className={styles.potCard}>
                <div className={styles.potCard__banner}>
                    <div className={styles.potCard__brand}>
                        <span className={styles.potCard__brandIcon}><GiftIcon /></span>
                        <div className={styles.potCard__bannerText}>
                            <p className={styles.potCard__bannerTitle}>{t('kicker')}</p>
                            <p className={styles.potCard__bannerSub}>{t('loginToSee')}</p>
                        </div>
                    </div>
                    <button className={styles.potCard__button} type="button" onClick={() => onRequireLogin?.()}>
                        {t('contribute')}
                    </button>
                </div>
            </div>
        )
    }

    const myPledge = pot.myContribution ?? 0
    const participantCount = pot.participantCount ?? 0
    const isCreator = pot.isCreator === true

    const totalsRow = (
        <div className={styles.potCard__totals}>
            <div>
                <span className={styles.potCard__amount}>{fmt(pot.totalContributed)}</span>
                <span className={styles.potCard__amountLabel}>{t('pledgedTotal')}</span>
            </div>
            <span className={styles.potCard__meta}>{t('participants', { count: participantCount })}</span>
        </div>
    )

    const meRow = (organizerTag: boolean) => (
        <li className={styles.potCard__row}>
            <span className={styles.potCard__avatar}>{initials(isCreator ? pot.creatorName : t('you'))}</span>
            <div className={styles.potCard__person}>
                <p className={styles.potCard__name}>
                    {isCreator ? pot.creatorName : t('you')}
                    <span className={styles.potCard__tag}>{organizerTag ? t('youOrganizer') : t('you')}</span>
                </p>
            </div>
            {myPledge > 0 ? (
                <>
                    <span className={styles.potCard__rowAmount}>{fmt(myPledge)}</span>
                    <button className={styles.potCard__rowLink} type="button" onClick={model.openEdit}>
                        {t('modify')}
                    </button>
                </>
            ) : (
                <button className={styles.potCard__button} type="button" onClick={model.openAdd}>
                    {t('contribute')}
                </button>
            )}
        </li>
    )

    const note = (
        <p className={styles.potCard__note}>
            <LockIcon />
            <span>
                {isCreator
                    ? t.rich('noteOrganizer', { strong: (c) => <strong>{c}</strong> })
                    : t.rich('noteGuest', { creatorName: pot.creatorName, strong: (c) => <strong>{c}</strong> })}
            </span>
        </p>
    )

    const modalEl = model.modal && (
        <ContributeModal
            isOpen
            onClose={model.closeModal}
            wishlistId={wishlistId}
            eventName={eventName}
            ownerName={ownerName}
            creatorName={pot.creatorName}
            totalContributed={pot.totalContributed}
            userContributed={myPledge}
            currency={currency}
            isLoggedIn={isLoggedIn}
            mode={model.modal}
            initialAmount={model.modal === 'edit' ? myPledge : 0}
            onContribute={onContribute}
            onError={onContributeError}
            onRemove={onContributeRemoved}
            onSaved={model.reconcile}
            useMock={useMock}
        />
    )

    // ── Guest who hasn't pledged → compact banner ────────────
    if (!isCreator && myPledge <= 0) {
        return (
            <div className={styles.potCard}>
                <div className={styles.potCard__banner}>
                    <div className={styles.potCard__brand}>
                        <span className={styles.potCard__brandIcon}><GiftIcon /></span>
                        <div className={styles.potCard__bannerText}>
                            <p className={styles.potCard__bannerTitle}>{t('kicker')}</p>
                            <p className={styles.potCard__bannerSub}>
                                {pot.totalContributed > 0 ? (
                                    <><strong>{fmt(pot.totalContributed)}</strong> {t('pledgedByFriends')} &middot; {t('organisedBy', { creatorName: pot.creatorName })}</>
                                ) : (
                                    t('organisedBy', { creatorName: pot.creatorName })
                                )}
                            </p>
                        </div>
                    </div>
                    <button className={styles.potCard__button} type="button" onClick={model.openAdd}>
                        {t('contribute')}
                    </button>
                </div>
                {modalEl}
            </div>
        )
    }

    // ── Guest who has pledged ───────────────────────────────
    if (!isCreator) {
        const othersAmount = Math.max(0, pot.totalContributed - myPledge)
        const othersCount = Math.max(0, participantCount - 1)
        return (
            <div className={styles.potCard}>
                <div className={styles.potCard__head}>
                    <div className={styles.potCard__brand}>
                        <span className={styles.potCard__brandIcon}><GiftIcon /></span>
                        <div>
                            <p className={styles.potCard__kicker}>{t('kicker')}</p>
                            <h2 className={styles.potCard__title}>{t('guestTitle')}</h2>
                        </div>
                    </div>
                </div>

                {totalsRow}

                <div className={styles.potCard__listWrap}>
                    <ul className={styles.potCard__list}>
                        {meRow(false)}
                        {othersCount > 0 && (
                            <li className={`${styles.potCard__row} ${styles['potCard__row--anon']}`}>
                                <span className={`${styles.potCard__avatar} ${styles['potCard__avatar--anon']}`}>
                                    {othersCount}
                                </span>
                                <div className={styles.potCard__person}>
                                    <p className={styles.potCard__name}>{t('otherParticipants', { count: othersCount })}</p>
                                    <p className={styles.potCard__when}>{t('pledgesHidden')}</p>
                                </div>
                                <span className={styles.potCard__rowAmount}>{fmt(othersAmount)}</span>
                            </li>
                        )}
                    </ul>
                </div>

                {note}
                {modalEl}
            </div>
        )
    }

    // ── Organizer view ───────────────────────────────────────
    const others = model.visibleContributors.filter((c) => c.name !== pot.creatorName)

    return (
        <div className={styles.potCard}>
            <div className={styles.potCard__head}>
                <div className={styles.potCard__brand}>
                    <span className={styles.potCard__brandIcon}><GiftIcon /></span>
                    <div>
                        <p className={styles.potCard__kicker}>{t('kicker')}</p>
                        <h2 className={styles.potCard__title}>{t('organizerTitle')}</h2>
                    </div>
                </div>
                <span className={styles.potCard__chip}>{t('startedByYou')}</span>
            </div>

            {totalsRow}

            {model.isDense && (
                <div className={styles.potCard__toolbar}>
                    <div className={styles.potCard__search}>
                        <SearchIcon />
                        <input
                            className={styles.potCard__searchInput}
                            type="text"
                            value={model.search}
                            onChange={(e) => model.setSearch(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            aria-label={t('searchPlaceholder')}
                        />
                    </div>
                    <select
                        className={styles.potCard__sort}
                        value={model.sortBy}
                        onChange={(e) => model.setSortBy(e.target.value as 'amount' | 'date' | 'name')}
                        aria-label={t('sortLabel')}
                    >
                        <option value="amount">{t('sortAmount')}</option>
                        <option value="date">{t('sortDate')}</option>
                        <option value="name">{t('sortName')}</option>
                    </select>
                </div>
            )}

            <div className={styles.potCard__pinned}>
                <ul className={styles.potCard__list}>{meRow(true)}</ul>
            </div>

            <div className={`${styles.potCard__listWrap} ${model.isDense ? styles['potCard__listWrap--scroll'] : ''}`}>
                {others.length === 0 ? (
                    <p className={styles.potCard__empty}>{model.search ? t('noMatches') : t('noOtherPledges')}</p>
                ) : (
                    <ul className={styles.potCard__list}>
                        {others.map((c, i) => (
                            <li className={styles.potCard__row} key={`${c.name}-${i}`}>
                                <span className={styles.potCard__avatar}>{initials(c.name)}</span>
                                <div className={styles.potCard__person}>
                                    <p className={styles.potCard__name}>{c.name}</p>
                                    {c.lastContributedAt && (
                                        <p className={styles.potCard__when}>
                                            {t('pledgedOn', { date: formatDate(c.lastContributedAt, locale) })}
                                        </p>
                                    )}
                                </div>
                                <span className={styles.potCard__rowAmount}>{fmt(c.amount)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {note}
            {modalEl}
        </div>
    )
}
