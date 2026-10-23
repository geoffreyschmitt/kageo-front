import { getTranslations } from 'next-intl/server'

import { Link } from '@/shared/i18n/navigation'

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
            {LINKS.map(({ href, key }) => (
                <Link key={key} href={href} className={styles.link}>
                    {t(key)}
                </Link>
            ))}
        </footer>
    )
}
