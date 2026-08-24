import Image from "next/image"
import { getServerSession } from "next-auth"
import { getTranslations } from 'next-intl/server'
import { kv } from "@vercel/kv"

import { authOptions } from "@/shared/config/authOptions"
import DashboardPage from "@/views/dashboard/dashboard"
import { Link } from '@/shared/i18n/navigation'

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
        <main className={pageStyles.pageLayout}>
            <section className={pageStyles.hero}>
                <div className={pageStyles.hero__content}>
                    <h1 className={pageStyles.hero__title}>{t('heroTitle')}</h1>
                    <p className={pageStyles.hero__description}>{t('heroDescription')}</p>
                    <div className={pageStyles.hero__actions}>
                        <Link href="/wishlists" className={pageStyles.hero__buttonPrimary}>
                            {t('getStarted')}
                        </Link>
                        <Link href="/features" className={pageStyles.hero__buttonSecondary}>
                            {t('learnMore')}
                        </Link>
                    </div>
                </div>
                <div className={pageStyles.hero__imageContainer}>
                    <Image
                        src="/placeholder.svg"
                        alt={t('heroImageAlt')}
                        className={pageStyles.hero__image}
                        width={600}
                        height={400}
                    />
                </div>
            </section>

            <section className={pageStyles.features}>
                <h2 className={pageStyles.features__title}>{t('whyChoose')}</h2>
                <div className={pageStyles.features__grid}>
                    <div className={pageStyles.featureCard}>
                        <div className={pageStyles.featureCard__icon}>✨</div>
                        <h3 className={pageStyles.featureCard__title}>{t('effortlessCreationTitle')}</h3>
                        <p className={pageStyles.featureCard__description}>{t('effortlessCreationDesc')}</p>
                    </div>
                    <div className={pageStyles.featureCard}>
                        <div className={pageStyles.featureCard__icon}>🤝</div>
                        <h3 className={pageStyles.featureCard__title}>{t('collaborationTitle')}</h3>
                        <p className={pageStyles.featureCard__description}>{t('collaborationDesc')}</p>
                    </div>
                    <div className={pageStyles.featureCard}>
                        <div className={pageStyles.featureCard__icon}>🎁</div>
                        <h3 className={pageStyles.featureCard__title}>{t('neverMissTitle')}</h3>
                        <p className={pageStyles.featureCard__description}>{t('neverMissDesc')}</p>
                    </div>
                    <div className={pageStyles.featureCard}>
                        <div className={pageStyles.featureCard__icon}>🔒</div>
                        <h3 className={pageStyles.featureCard__title}>{t('privacyTitle')}</h3>
                        <p className={pageStyles.featureCard__description}>{t('privacyDesc')}</p>
                    </div>
                </div>
            </section>

            <section className={pageStyles.cta}>
                <h2 className={pageStyles.cta__title}>{t('ctaTitle')}</h2>
                <p className={pageStyles.cta__description}>{t('ctaDescription')}</p>
                <Link href="/wishlists" className={pageStyles.cta__button}>
                    {t('ctaButton')}
                </Link>
            </section>
        </main>
    )
}
