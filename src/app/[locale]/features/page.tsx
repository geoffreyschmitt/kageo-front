import Image from "next/image"
import { getTranslations } from 'next-intl/server'
import { Link } from '@/shared/i18n/navigation'

import styles from "./page.module.css"

export default async function FeaturesPage() {
    const t = await getTranslations('featuresPage')

    return (
        <main className={styles.featuresPageLayout}>
            <section className={styles.featuresHero}>
                <div className={styles.featuresHero__content}>
                    <h1 className={styles.featuresHero__title}>{t('heroTitle')}</h1>
                    <p className={styles.featuresHero__description}>{t('heroDescription')}</p>
                    <Link href="/wishlists" className={styles.featuresHero__ctaButton}>
                        {t('heroCta')}
                    </Link>
                </div>
            </section>

            <section className={styles.featureSection}>
                <div className={styles.featureSection__header}>
                    <h2 className={styles.featureSection__title}>{t('itemManagementTitle')}</h2>
                    <p className={styles.featureSection__description}>{t('itemManagementDesc')}</p>
                </div>
                <div className={styles.featureSection__grid}>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Add Item Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('quickAddTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('quickAddText')}</p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Priority Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('priorityTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('priorityText')}</p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Filter Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('sortingTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('sortingText')}</p>
                    </div>
                </div>
            </section>

            <section className={`${styles.featureSection} ${styles["featureSection--altBackground"]}`}>
                <div className={styles.featureSection__header}>
                    <h2 className={styles.featureSection__title}>{t('sharingTitle')}</h2>
                    <p className={styles.featureSection__description}>{t('sharingDesc')}</p>
                </div>
                <div className={styles.featureSection__grid}>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Share Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('easyShareTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('easyShareText')}</p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Collaborate Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('multiUserTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('multiUserText')}</p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Privacy Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('privacyTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('privacyText')}</p>
                    </div>
                </div>
            </section>

            <section className={styles.featureSection}>
                <div className={styles.featureSection__header}>
                    <h2 className={styles.featureSection__title}>{t('organizeTitle')}</h2>
                    <p className={styles.featureSection__description}>{t('organizeDesc')}</p>
                </div>
                <div className={styles.featureSection__grid}>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Tabs Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('tabbedTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('tabbedText')}</p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Customization Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('customizeTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('customizeText')}</p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Owner Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>{t('ownershipTitle')}</h3>
                        <p className={styles.featureCard__text}>{t('ownershipText')}</p>
                    </div>
                </div>
            </section>

            <section className={styles.featuresCta}>
                <h2 className={styles.featuresCta__title}>{t('ctaTitle')}</h2>
                <p className={styles.featuresCta__description}>{t('ctaDescription')}</p>
                <Link href="/wishlists" className={styles.featuresCta__button}>
                    {t('ctaButton')}
                </Link>
            </section>
        </main>
    )
}
