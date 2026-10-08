import { getTranslations } from 'next-intl/server'

import { Link } from '@/shared/i18n/navigation'

import styles from './Footer.module.css'

export const Footer = async () => {
    const t = await getTranslations('footer')

    return (
        <footer className={styles.footer}>
            <Link href="/privacy" className={styles.link}>
                {t('privacy')}
            </Link>
        </footer>
    )
}
