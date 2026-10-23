'use client'

import { useTranslations } from 'next-intl'

import { Link } from '@/shared/i18n/navigation'

import { useForgotPasswordModel } from '../model'

import styles from './PasswordResetForm.module.css'

export const ForgotPasswordForm = () => {
    const t = useTranslations('passwordReset')
    const { email, setEmail, status, error, submit } = useForgotPasswordModel()

    return (
        <main className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>{t('forgotTitle')}</h1>

                {status === 'done' ? (
                    <p className={styles.text} role="status">
                        {t('forgotSent')}
                    </p>
                ) : (
                    <>
                        <p className={styles.text}>{t('forgotIntro')}</p>
                        <form className={styles.form} onSubmit={submit}>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="forgot-email">
                                    {t('email')}
                                </label>
                                <input
                                    id="forgot-email"
                                    className={styles.input}
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            {error && (
                                <p className={styles.error} role="alert">
                                    {error}
                                </p>
                            )}
                            <button className={styles.submit} type="submit" disabled={status === 'sending'}>
                                {status === 'sending' ? t('sending') : t('forgotSubmit')}
                            </button>
                        </form>
                    </>
                )}

                <Link href="/" className={styles.link}>
                    {t('backHome')}
                </Link>
            </div>
        </main>
    )
}
