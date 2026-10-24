'use client'

import { useId, type ReactNode } from 'react'

import { useLocale, useTranslations } from 'next-intl'

import { ContributeModal } from '@/features/ContributePot'
import { CreatePotButton } from '@/features/CreatePot'

import { formatDate } from '@/shared/lib/formatDate'

import { usePotCardModel } from './model'
import styles from './PotCard.module.css'
import type { TPotCardProps } from './PotCard.types'

// People, not a gift box: the per-wish pot keeps the gift icon, so the two read differently.
const GroupIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
        <circle cx="17.2" cy="9" r="2.4" />
        <path d="M17 14c2.4 0 4.2 1.7 4.2 4.2" />
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

const ChevronIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
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
}: TPotCardProps) => {
    const t = useTranslations('potCard')
    const locale = useLocale()
    const model = usePotCardModel({ wishlistId, pot, onPotRefreshed })
    const detailsId = useId()

    const fmt = (n: number) => `${currency}${n.toFixed(2)}`

    // ── No pot yet ────────────────────────────────────────────
    if (!pot) {
        return (
            <div className={styles.potCard}>
                <div className={styles.potCard__banner}>
                    <div className={styles.potCard__brand}>
                        <span className={styles.potCard__brandIcon}><GroupIcon /></span>
                        <div className={styles.potCard__bannerText}>
                            <p className={styles.potCard__bannerTitle}>{t('title', { ownerName })}</p>
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
                        <span className={styles.potCard__brandIcon}><GroupIcon /></span>
                        <div className={styles.potCard__bannerText}>
                            <p className={styles.potCard__bannerTitle}>{t('title', { ownerName })}</p>
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

    // The pledged guest and the organizer get a one-row summary; the lists stay folded until asked for,
    // so the wishes below are not pushed off screen.
    const summaryRow = (sub: ReactNode) => (
        <div className={styles.potCard__banner}>
            <div className={styles.potCard__brand}>
                <span className={styles.potCard__brandIcon}><GroupIcon /></span>
                <div className={styles.potCard__bannerText}>
                    <p className={styles.potCard__bannerTitle}>{t('title', { ownerName })}</p>
                    <p className={styles.potCard__bannerSub}>{sub}</p>
                </div>
            </div>
            <button
                className={styles.potCard__toggle}
                type="button"
                aria-expanded={model.expanded}
                aria-controls={detailsId}
                onClick={model.toggleExpanded}
            >
                {model.expanded ? t('hideDetails') : t('details')}
                <span className={`${styles.potCard__chevron} ${model.expanded ? styles['potCard__chevron--open'] : ''}`}><ChevronIcon /></span>
            </button>
        </div>
    )

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
        />
    )

    // ── Guest who hasn't pledged → compact banner ────────────
    if (!isCreator && myPledge <= 0) {
        return (
            <div className={styles.potCard}>
                <div className={styles.potCard__banner}>
                    <div className={styles.potCard__brand}>
                        <span className={styles.potCard__brandIcon}><GroupIcon /></span>
                        <div className={styles.potCard__bannerText}>
                            <p className={styles.potCard__bannerTitle}>{t('title', { ownerName })}</p>
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
                {summaryRow(<>{t('youPledged', { amount: fmt(myPledge) })} &middot; {fmt(pot.totalContributed)} {t('pledgedTotal')}</>)}

                <div id={detailsId} className={styles.potCard__details} hidden={!model.expanded}>
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
                </div>
                {modalEl}
            </div>
        )
    }

    // ── Organizer view ───────────────────────────────────────
    const others = model.visibleContributors.filter((c) => !c.isOrganiser)

    return (
        <div className={styles.potCard}>
            {summaryRow(<>{t('startedByYou')} &middot; {fmt(pot.totalContributed)} {t('pledgedTotal')} &middot; {t('participants', { count: participantCount })}</>)}

            <div id={detailsId} className={styles.potCard__details} hidden={!model.expanded}>
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

                {(pot?.contributors?.length ?? 0) > 0 && (
                    <a
                        className={styles.potCard__export}
                        href={`/api/wishlist/pot/export?wishlistId=${encodeURIComponent(wishlistId)}`}
                        download
                    >
                        {t('exportCsv')}
                    </a>
                )}

                {note}
            </div>
            {modalEl}
        </div>
    )
}
