'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/shared/ui'

import { useInstallPrompt } from '../model'

import styles from './InstallPrompt.module.css'

export const InstallPrompt = () => {
    const t = useTranslations('installPrompt')
    const { mode, install, dismiss } = useInstallPrompt()

    if (!mode) return null

    return (
        <aside className={styles.banner} aria-label={t('title')}>
            <div className={styles.text}>
                <p className={styles.title}>{t('title')}</p>
                <p className={styles.description}>{mode === 'ios' ? t('iosDescription') : t('description')}</p>
            </div>
            <div className={styles.actions}>
                {mode === 'native' && <Button onClick={install}>{t('install')}</Button>}
                <Button variant="ghost" onClick={dismiss}>
                    {t(mode === 'ios' ? 'gotIt' : 'notNow')}
                </Button>
            </div>
        </aside>
    )
}
