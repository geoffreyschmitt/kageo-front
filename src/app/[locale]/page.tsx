import { kv } from "@vercel/kv"
import { getServerSession } from "next-auth"
import { getLocale, getTranslations } from 'next-intl/server'

import DashboardPage from "@/views/dashboard/dashboard"

import { authOptions } from "@/shared/config/authOptions"
import { Bow, EnvelopeGlyph, ListGlyph, Logo } from "@/shared/ui"

import { MockWish } from "./LandingMocks"
import { LoginCta } from "./LoginCta"
import pageStyles from "./page.module.css"

// Sample data for the product pictures: a fixed date, so the page never claims a moment it did not happen.
const DEMO_ADDED = Date.UTC(2026, 9, 12, 12)
const DEMO_RESERVER = 'Marc'

export default async function HomePage() {
    const session = await getServerSession(authOptions)

    if (session?.user?.id) {
        const wishlistIds = await kv.smembers<string[]>(`user:${session.user.id}:wishlists`)
        const rawWishlists = wishlistIds?.length
            ? (
                await Promise.all(
                    wishlistIds.map((id) => kv.get<Record<string, unknown>>(`wishlist:${id}`)),
                )
              ).filter(Boolean) as Record<string, unknown>[]
            : []

        const itemCounts = await Promise.all(
            rawWishlists.map((w) => kv.scard(`wishlist:${w.id as string}:wishes`)),
        )
        const wishlists = rawWishlists.map((w, i) => ({ ...w, itemCount: itemCounts[i] ?? 0 }))

        return (
            <DashboardPage
                userName={session.user.name ?? null}
                wishlists={wishlists as Parameters<typeof DashboardPage>[0]['wishlists']}
            />
        )
    }

    const t = await getTranslations('landing')
    const locale = await getLocale()
    const addedDate = new Date(DEMO_ADDED).toLocaleDateString(locale)
    const cocotte = { name: t('demoItem1'), price: 140, addedDate, reservedByName: DEMO_RESERVER }
    const luberon = { name: t('demoItem2'), price: 500, addedDate }
    const tablier = { name: t('demoItem3'), price: 35, addedDate }

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
                        <a href="#exemple" className={pageStyles.hero__ctaSecondary}>
                            {t('exampleLink')}
                        </a>
                    </div>
                    <p className={pageStyles.hero__reassure}>{t('heroNoAccount')}</p>
                </div>

                <div className={pageStyles.heroCards}>
                    <p className={pageStyles.srOnly}>{t('demoCardLabel')}</p>
                    <MockWish variant="reserved" {...cocotte} />
                    <div className={pageStyles.heroCards__second}>
                        <MockWish variant="pot-out" {...luberon} />
                    </div>
                </div>
            </section>

            <section className={pageStyles.steps}>
                <div className={pageStyles.steps__inner}>
                    <h2 className={pageStyles.steps__title}>{t('stepsTitle')}</h2>
                    <p className={pageStyles.steps__subtitle}>{t('stepsSubtitle')}</p>
                    <ol className={pageStyles.steps__grid}>
                        <li className={pageStyles.step}>
                            <span className={pageStyles.step__icon} aria-hidden="true">
                                <ListGlyph width="28" height="28" />
                            </span>
                            <div>
                                <h3 className={pageStyles.step__title}>{t('step1Title')}</h3>
                                <p className={pageStyles.step__desc}>{t('step1Desc')}</p>
                            </div>
                        </li>
                        <li className={pageStyles.step}>
                            <span className={pageStyles.step__icon} aria-hidden="true">
                                <EnvelopeGlyph width="28" height="28" />
                            </span>
                            <div>
                                <h3 className={pageStyles.step__title}>{t('step2Title')}</h3>
                                <p className={pageStyles.step__desc}>{t('step2Desc')}</p>
                            </div>
                        </li>
                        <li className={pageStyles.step}>
                            <span className={pageStyles.step__icon} aria-hidden="true">
                                <Logo variant="symbol" width="30" height="30" aria-hidden="true" role="presentation" />
                            </span>
                            <div>
                                <h3 className={pageStyles.step__title}>{t('step3Title')}</h3>
                                <p className={pageStyles.step__desc}>{t('step3Desc')}</p>
                            </div>
                        </li>
                    </ol>
                </div>
            </section>

            <section id="exemple" className={pageStyles.guest}>
                <div className={pageStyles.guest__body}>
                    <h2 className={pageStyles.guest__title}>{t('guestTitle')}</h2>
                    <p className={pageStyles.guest__desc}>{t('guestDesc')}</p>
                </div>
                <figure className={pageStyles.phone}>
                    <p className={pageStyles.srOnly}>{t('guestPhoneLabel')}</p>
                    <div className={pageStyles.phone__screen}>
                        <MockWish variant="wanted" {...tablier} />
                    </div>
                    <figcaption className={pageStyles.phone__caption}>{t('guestPhoneCaption')}</figcaption>
                </figure>
            </section>

            <section className={pageStyles.pot}>
                <div className={pageStyles.pot__visual}>
                    <p className={pageStyles.srOnly}>{t('potCardLabel')}</p>
                    <MockWish variant="pot-in" {...luberon} />
                </div>
                <div className={pageStyles.pot__body}>
                    <h2 className={pageStyles.pot__title}>{t('potTitle')}</h2>
                    <p className={pageStyles.pot__description}>{t('potDescription')}</p>
                    <ul className={pageStyles.pot__points}>
                        <li className={pageStyles.pot__point}>{t('potPoint1')}</li>
                        <li className={pageStyles.pot__point}>{t('potPoint2')}</li>
                        <li className={pageStyles.pot__point}>{t('potPoint3')}</li>
                    </ul>
                    <p className={pageStyles.pot__note}>{t('potNote')}</p>
                </div>
            </section>

            <section className={pageStyles.surprise}>
                <div className={pageStyles.surprise__inner}>
                    <h2 className={pageStyles.surprise__title}>{t('surpriseTitle')}</h2>
                    <p className={pageStyles.surprise__desc}>{t('surpriseDesc')}</p>
                    <div className={pageStyles.surprise__compare}>
                        <div className={pageStyles.view}>
                            <h3 className={pageStyles.view__title}>{t('ownerViewTitle')}</h3>
                            <p className={pageStyles.view__note}>{t('ownerViewNote')}</p>
                            <MockWish variant="owner" {...cocotte} />
                        </div>
                        <div className={pageStyles.surprise__ribbon} aria-hidden="true">
                            <Bow className={pageStyles.surprise__bow} />
                        </div>
                        <div className={`${pageStyles.view} ${pageStyles.viewEnd}`}>
                            <h3 className={pageStyles.view__title}>{t('guestViewTitle')}</h3>
                            <p className={pageStyles.view__note}>{t('guestViewNote')}</p>
                            <MockWish variant="reserved" {...cocotte} />
                        </div>
                    </div>
                </div>
            </section>

            <section className={pageStyles.notes}>
                <p className={pageStyles.note}>
                    <strong className={pageStyles.note__lead}>{t('privacy2Title')}</strong>{' '}
                    {t('privacy2Desc')}
                </p>
                <p className={pageStyles.note}>
                    <strong className={pageStyles.note__lead}>{t('privacy3Title')}</strong>{' '}
                    {t('privacy3Desc')}
                </p>
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
