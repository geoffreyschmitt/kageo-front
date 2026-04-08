'use client'

import { useLocale } from 'next-intl'
import { usePathname, Link } from '@/shared/i18n/navigation'

import styles from './LanguageSwitcher.module.css'

export const LanguageSwitcher = () => {
    const locale = useLocale()
    const pathname = usePathname()

    return (
        <div className={styles.switcher}>
            <Link
                href={pathname}
                locale="fr"
                className={`${styles.option} ${locale === 'fr' ? styles['option--active'] : ''}`}
            >
                FR
            </Link>
            <span className={styles.divider} aria-hidden="true">|</span>
            <Link
                href={pathname}
                locale="en"
                className={`${styles.option} ${locale === 'en' ? styles['option--active'] : ''}`}
            >
                EN
            </Link>
        </div>
    )
}
