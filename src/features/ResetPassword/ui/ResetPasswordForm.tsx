'use client'

import { useTranslations } from 'next-intl'

import { Link } from '@/shared/i18n/navigation'

import { useResetPasswordModel } from '../model'

import styles from './PasswordResetForm.module.css'

export const ResetPasswordForm = ({ token }: { token: string }) => {
    const t = useTranslations('passwordReset')
    const { password, setPassword, confirm, setConfirm, status, error, linkInvalid, submit } =
        useResetPasswordModel(token)

    return (
        <main className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>{t('resetTitle')}</h1>

                {status === 'done' ? (
                    <>
                        <p className={styles.text} role="status">
                            {t('resetDone')}
                        </p>
                        <Link href="/" className={styles.link}>
                            {t('goLogin')}
                        </Link>
                    </>
                ) : linkInvalid ? (
                    <>
                        <p className={styles.error} role="alert">
                            {t('linkInvalid')}
                        </p>
                        <Link href="/forgot-password" className={styles.link}>
                            {t('askAgain')}
                        </Link>
                    </>
                ) : (
                    <form className={styles.form} onSubmit={submit}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="reset-password">
                                {t('newPassword')}
                            </label>
                            <input
                                id="reset-password"
                                className={styles.input}
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="reset-confirm">
                                {t('confirmPassword')}
                            </label>
                            <input
                                id="reset-confirm"
                                className={styles.input}
                                type="password"
                                autoComplete="new-password"
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                        </div>
                        {error && (
                            <p className={styles.error} role="alert">
                                {error}
                            </p>
                        )}
                        <button className={styles.submit} type="submit" disabled={status === 'sending'}>
                            {status === 'sending' ? t('sending') : t('resetSubmit')}
                        </button>
                    </form>
                )}
            </div>
        </main>
    )
}
