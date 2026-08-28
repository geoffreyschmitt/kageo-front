import { getServerSession } from "next-auth"
import { getTranslations } from 'next-intl/server'
import { kv } from "@vercel/kv"

import { authOptions } from "@/shared/config/authOptions"
import DashboardPage from "@/views/dashboard/dashboard"
import { Link } from '@/shared/i18n/navigation'

import { LoginCta } from "./LoginCta"

import pageStyles from "./page.module.css"

export default async function HomePage() {
    const session = await getServerSession(authOptions)
    const t = await getTranslations('landing')

    if (session?.user?.id) {
        const wishlistIds = await kv.smembers<string[]>(`user:${session.user.id}:wishlists`)
        const rawWishlists = wishlistIds?.length
            ? (
                await Promise.all(
                    wishlistIds.map((id) => kv.get<Record<string, unknown>>(`wishlist:${id}`)),
                )
              ).filter(Boolean) as Record<string, unknown>[]
            : []

        return (
            <DashboardPage
                userName={session.user.name ?? null}
                wishlists={rawWishlists as Parameters<typeof DashboardPage>[0]['wishlists']}
            />
        )
    }

    return (
        <main className={pageStyles.page}>
            <section className={pageStyles.hero}>
                <div className={pageStyles.hero__content}>
                    <h1 className={pageStyles.hero__title}>{t('heroTitle')}</h1>
                    <p className={pageStyles.hero__description}>{t('heroDescription')}</p>
                    <div className={pageStyles.hero__actions}>
                        <LoginCta className={pageStyles.hero__cta}>
                            {t('getStarted')}
                        </LoginCta>
                        <Link href="/features" className={pageStyles.hero__ctaSecondary}>
                            {t('learnMore')}
                        </Link>
                    </div>
                </div>

                <div className={pageStyles.heroCard} aria-hidden="true">
                    <div className={pageStyles.heroCard__inner}>
                        <div className={pageStyles.heroCard__head}>
                            <div className={pageStyles.heroCard__headTitle}>{t('demoListName')}</div>
                            <div className={pageStyles.heroCard__headMeta}>{t('demoListShared')}</div>
                        </div>
                        <div className={pageStyles.heroCard__list}>
                            <div className={pageStyles.heroCard__row}>
                                <span className={pageStyles.heroCard__thumb} />
                                <span className={pageStyles.heroCard__rowMain}>
                                    <span className={pageStyles.heroCard__rowTitle}>{t('demoItem1')}</span>
                                    <span className={pageStyles.heroCard__rowMeta}>€140</span>
                                </span>
                                <span className={`${pageStyles.pill} ${pageStyles['pill--reserved']}`}>
                                    {t('demoItem1Status')}
                                </span>
                            </div>
                            <div className={`${pageStyles.heroCard__row} ${pageStyles['heroCard__row--pot']}`}>
                                <span className={pageStyles.heroCard__thumb} />
                                <span className={pageStyles.heroCard__rowMain}>
                                    <span className={pageStyles.heroCard__rowTitle}>{t('demoItem2')}</span>
                                    <span className={pageStyles.heroCard__rowMeta}>{t('demoItem2Progress')}</span>
                                    <span className={pageStyles.heroCard__bar}>
                                        <span className={pageStyles.heroCard__barFill} />
                                    </span>
                                </span>
                                <span className={`${pageStyles.pill} ${pageStyles['pill--pot']}`}>
                                    {t('demoItem2Action')}
                                </span>
                            </div>
                            <div className={pageStyles.heroCard__row}>
                                <span className={pageStyles.heroCard__thumb} />
                                <span className={pageStyles.heroCard__rowMain}>
                                    <span className={pageStyles.heroCard__rowTitle}>{t('demoItem3')}</span>
                                    <span className={pageStyles.heroCard__rowMeta}>€35</span>
                                </span>
                                <span className={`${pageStyles.pill} ${pageStyles['pill--wanted']}`}>
                                    {t('demoItem3Action')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={pageStyles.steps}>
                <h2 className={pageStyles.steps__title}>{t('stepsTitle')}</h2>
                <p className={pageStyles.steps__subtitle}>{t('stepsSubtitle')}</p>
                <div className={pageStyles.steps__grid}>
                    <div className={pageStyles.step}>
                        <span className={pageStyles.step__icon}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                        </span>
                        <h3 className={pageStyles.step__title}>{t('step1Title')}</h3>
                        <p className={pageStyles.step__desc}>{t('step1Desc')}</p>
                    </div>
                    <div className={pageStyles.step}>
                        <span className={pageStyles.step__icon}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M4 12v8h16v-8" />
                                <path d="M12 3v13M7 8l5-5 5 5" />
                            </svg>
                        </span>
                        <h3 className={pageStyles.step__title}>{t('step2Title')}</h3>
                        <p className={pageStyles.step__desc}>{t('step2Desc')}</p>
                    </div>
                    <div className={pageStyles.step}>
                        <span className={pageStyles.step__icon}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </span>
                        <h3 className={pageStyles.step__title}>{t('step3Title')}</h3>
                        <p className={pageStyles.step__desc}>{t('step3Desc')}</p>
                    </div>
                </div>
            </section>

            <section className={pageStyles.pot}>
                <div className={pageStyles.pot__card} aria-hidden="true">
                    <div className={pageStyles.pot__cardItem}>{t('potCardItem')}</div>
                    <div className={pageStyles.pot__cardMeta}>{t('potCardContributors')}</div>
                    <div className={pageStyles.pot__cardAmount}>
                        <span className={pageStyles.pot__cardValue}>€310</span>
                        <span className={pageStyles.pot__cardGoal}>{t('potCardGoal')}</span>
                    </div>
                    <div className={pageStyles.pot__cardBar}>
                        <span className={pageStyles.pot__cardBarFill} />
                    </div>
                    <div className={pageStyles.pot__chips}>
                        <span className={pageStyles.pot__chip}>€20</span>
                        <span className={`${pageStyles.pot__chip} ${pageStyles['pot__chip--active']}`}>€50</span>
                        <span className={pageStyles.pot__chip}>{t('potCardOther')}</span>
                    </div>
                </div>
                <div className={pageStyles.pot__body}>
                    <div className={pageStyles.pot__eyebrow}>{t('potEyebrow')}</div>
                    <h2 className={pageStyles.pot__title}>{t('potTitle')}</h2>
                    <p className={pageStyles.pot__description}>{t('potDescription')}</p>
                    <ul className={pageStyles.pot__points}>
                        <li className={pageStyles.pot__point}>
                            <span className={pageStyles.pot__pointMark} aria-hidden="true">✓</span>
                            {t('potPoint1')}
                        </li>
                        <li className={pageStyles.pot__point}>
                            <span className={pageStyles.pot__pointMark} aria-hidden="true">✓</span>
                            {t('potPoint2')}
                        </li>
                        <li className={pageStyles.pot__point}>
                            <span className={pageStyles.pot__pointMark} aria-hidden="true">✓</span>
                            {t('potPoint3')}
                        </li>
                    </ul>
                </div>
            </section>

            <section className={pageStyles.privacy}>
                <div className={pageStyles.privacy__grid}>
                    <div className={pageStyles.privacy__item}>
                        <h3 className={pageStyles.privacy__itemTitle}>{t('privacy1Title')}</h3>
                        <p className={pageStyles.privacy__itemDesc}>{t('privacy1Desc')}</p>
                    </div>
                    <div className={pageStyles.privacy__item}>
                        <h3 className={pageStyles.privacy__itemTitle}>{t('privacy2Title')}</h3>
                        <p className={pageStyles.privacy__itemDesc}>{t('privacy2Desc')}</p>
                    </div>
                    <div className={pageStyles.privacy__item}>
                        <h3 className={pageStyles.privacy__itemTitle}>{t('privacy3Title')}</h3>
                        <p className={pageStyles.privacy__itemDesc}>{t('privacy3Desc')}</p>
                    </div>
                </div>
            </section>

            <section className={pageStyles.cta}>
                <h2 className={pageStyles.cta__title}>{t('ctaTitle')}</h2>
                <p className={pageStyles.cta__description}>{t('ctaDescription')}</p>
                <LoginCta className={pageStyles.cta__button}>
                    {t('ctaButton')}
                </LoginCta>
            </section>
        </main>
    )
}
