import { getTranslations } from 'next-intl/server'

import { Link } from '@/shared/i18n/navigation'
import { Logo } from '@/shared/ui/Logo'

import styles from './Footer.module.css'

const LINKS = [
    { href: '/privacy', key: 'privacy' },
    { href: '/terms', key: 'terms' },
    { href: '/cookies', key: 'cookies' },
    { href: '/legal-notice', key: 'legalNotice' },
] as const

export const Footer = async () => {
    const t = await getTranslations('footer')

    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.brand}>
                    <Logo variant="symbol" className={styles.mark} aria-hidden="true" />
                    <p className={styles.tagline}>{t('tagline')}</p>
                </div>
                <nav aria-label={t('navLabel')}>
                    <ul className={styles.links}>
                        {LINKS.map(({ href, key }) => (
                            <li key={key}>
                                <Link href={href} className={styles.link}>
                                    {t(key)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <p className={styles.copyright}>{t('copyright', { year: new Date().getFullYear() })}</p>
        </footer>
    )
}
