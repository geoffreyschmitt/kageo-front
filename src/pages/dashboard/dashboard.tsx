'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { WishlistCard } from '@/widgets/WishlistCard'
import { TWishlistCard } from '@/widgets/WishlistCard'
import { CreateWishlistModal } from '@/features/CreateWishlist'
import { eventBus } from '@/shared/eventBus'
import { Link } from '@/shared/i18n/navigation'

import styles from './dashboard.module.css'

type TRawWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    eventDate: string
    createdAt: string
    updatedAt?: string
    itemCount?: number
}

type TDashboardPageProps = {
    userName: string | null
    wishlists: TRawWishlist[]
}

function getDaysUntil(date: Date): number {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function DashboardPage({ userName, wishlists }: TDashboardPageProps) {
    const router = useRouter()
    const t = useTranslations('dashboard')
    const firstName = userName?.split(' ')[0] ?? 'there'

    const getCountdownLabel = (days: number): string => {
        if (days === 0) return t('today')
        if (days === 1) return t('tomorrow')
        if (days < 0) return t('daysAgo', { count: Math.abs(days) })
        return t('inDays', { count: days })
    }

    const hydrated: TWishlistCard[] = wishlists.map((w) => ({
        id: w.id,
        ownerId: w.ownerId,
        ownerName: userName ?? 'Me',
        name: w.name,
        description: w.description,
        isPublic: w.isPublic,
        coverImage: w.coverImage,
        eventDate: new Date(w.eventDate),
        createdAt: new Date(w.createdAt),
        itemCount: w.itemCount ?? 0,
    }))

    const upcoming = hydrated
        .filter((w) => getDaysUntil(w.eventDate) >= 0)
        .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())

    const past = hydrated
        .filter((w) => getDaysUntil(w.eventDate) < 0)
        .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())

    const thisWeek = upcoming.filter((w) => getDaysUntil(w.eventDate) <= 7)
    const thisMonth = upcoming.filter((w) => {
        const d = getDaysUntil(w.eventDate)
        return d > 7 && d <= 30
    })
    const later = upcoming.filter((w) => getDaysUntil(w.eventDate) > 30)

    const nextEvent = upcoming[0] ?? null
    const nextDays = nextEvent ? getDaysUntil(nextEvent.eventDate) : null

    return (
        <main className={styles.dashboard}>
            {/* ── Greeting ── */}
            <section className={styles.greeting}>
                <div className={styles.greeting__inner}>
                    <p className={styles.greeting__eyebrow}>{t('welcomeBack')}</p>
                    <h1 className={styles.greeting__title}>{t('hello', { name: firstName })}</h1>

                    {nextEvent && nextDays !== null ? (
                        <div className={`${styles.nextEvent} ${nextDays <= 3 ? styles['nextEvent--urgent'] : nextDays === 0 ? styles['nextEvent--today'] : ''}`}>
                            <span className={styles.nextEvent__label}>{t('nextEvent')}</span>
                            <span className={styles.nextEvent__name}>{nextEvent.name}</span>
                            <span className={styles.nextEvent__countdown}>{getCountdownLabel(nextDays)}</span>
                        </div>
                    ) : hydrated.length === 0 ? (
                        <p className={styles.greeting__sub}>{t('noWishlists')}</p>
                    ) : (
                        <p className={styles.greeting__sub}>{t('noUpcoming')}</p>
                    )}

                    <div className={styles.greeting__actions}>
                        <button
                            className={styles.greeting__ctaPrimary}
                            onClick={() => eventBus.emit('wishlist:openCreationModal', {})}
                        >
                            {t('newWishlist')}
                        </button>
                        <Link href="/wishlists" className={styles.greeting__ctaSecondary}>
                            {t('allWishlists')}
                        </Link>
                    </div>
                </div>
            </section>

            <div className={styles.content}>
                {upcoming.length === 0 && past.length === 0 && (
                    <section className={styles.empty}>
                        <div className={styles.empty__icon} aria-hidden="true">
                            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
                                <rect x="14" y="38" width="52" height="30" rx="4" fill="#f2ede5" stroke="#d6cec4" strokeWidth="1.5"/>
                                <rect x="11" y="28" width="58" height="14" rx="4" fill="#ebe5da" stroke="#d6cec4" strokeWidth="1.5"/>
                                <rect x="34" y="28" width="12" height="40" rx="2" fill="#eaf2eb" stroke="#b8dbb9" strokeWidth="1"/>
                                <path d="M40 28 C32 18 20 20 22 28 C24 35 38 31 40 28Z" fill="#eaf2eb" stroke="#3f6845" strokeWidth="1" opacity="0.8"/>
                                <path d="M40 28 C48 18 60 20 58 28 C56 35 42 31 40 28Z" fill="#eaf2eb" stroke="#3f6845" strokeWidth="1" opacity="0.8"/>
                            </svg>
                        </div>
                        <h2 className={styles.empty__title}>{t('nothingYet')}</h2>
                        <p className={styles.empty__text}>{t('createFirst')}</p>
                        <button
                            className={styles.empty__cta}
                            onClick={() => eventBus.emit('wishlist:openCreationModal', {})}
                        >
                            {t('createWishlist')}
                        </button>
                    </section>
                )}

                {thisWeek.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.section__header}>
                            <h2 className={styles.section__title}>{t('thisWeek')}</h2>
                            <span className={`${styles.section__badge} ${styles['section__badge--urgent']}`}>
                                {t('events', { count: thisWeek.length })}
                            </span>
                        </div>
                        <div className={styles.section__grid}>
                            {thisWeek.map((w) => (
                                <div key={w.id} className={styles.cardWrap}>
                                    <div className={`${styles.cardWrap__pill} ${getDaysUntil(w.eventDate) <= 1 ? styles['cardWrap__pill--today'] : ''}`}>
                                        {getCountdownLabel(getDaysUntil(w.eventDate))}
                                    </div>
                                    <WishlistCard {...w} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {thisMonth.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.section__header}>
                            <h2 className={styles.section__title}>{t('thisMonth')}</h2>
                            <span className={styles.section__badge}>
                                {t('events', { count: thisMonth.length })}
                            </span>
                        </div>
                        <div className={styles.section__grid}>
                            {thisMonth.map((w) => (
                                <div key={w.id} className={styles.cardWrap}>
                                    <div className={styles.cardWrap__pill}>
                                        {getCountdownLabel(getDaysUntil(w.eventDate))}
                                    </div>
                                    <WishlistCard {...w} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {later.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.section__header}>
                            <h2 className={styles.section__title}>{t('furtherAhead')}</h2>
                            <span className={styles.section__badge}>
                                {t('events', { count: later.length })}
                            </span>
                        </div>
                        <div className={styles.section__grid}>
                            {later.map((w) => (
                                <div key={w.id} className={styles.cardWrap}>
                                    <div className={styles.cardWrap__pill}>
                                        {getCountdownLabel(getDaysUntil(w.eventDate))}
                                    </div>
                                    <WishlistCard {...w} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {past.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.section__header}>
                            <h2 className={`${styles.section__title} ${styles['section__title--muted']}`}>{t('pastEvents')}</h2>
                            <Link href="/history" className={styles.section__link}>{t('viewAllHistory')}</Link>
                        </div>
                        <div className={styles.section__grid}>
                            {past.slice(0, 3).map((w) => (
                                <div key={w.id} className={`${styles.cardWrap} ${styles['cardWrap--past']}`}>
                                    <div className={`${styles.cardWrap__pill} ${styles['cardWrap__pill--past']}`}>
                                        {getCountdownLabel(getDaysUntil(w.eventDate))}
                                    </div>
                                    <WishlistCard {...w} isHistory />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <CreateWishlistModal
                onSubmit={() => router.refresh()}
                onError={() => {}}
            />
        </main>
    )
}
