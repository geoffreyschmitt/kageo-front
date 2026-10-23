'use client'

import { useState, type FormEvent } from 'react'

import { useLocale, useTranslations } from 'next-intl'

import { RateLimitedError } from '@/shared/api/assertOk'
import { InvalidResetLinkError, requestPasswordReset, resetPassword } from '@/shared/api/auth'

type TStatus = 'idle' | 'sending' | 'done'

const MIN_PASSWORD_LENGTH = 6

export const useForgotPasswordModel = () => {
    const t = useTranslations('passwordReset')
    const locale = useLocale()
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<TStatus>('idle')
    const [error, setError] = useState('')

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setStatus('sending')
        setError('')
        try {
            await requestPasswordReset(email.trim(), locale)
            setStatus('done')
        } catch (err) {
            setStatus('idle')
            setError(err instanceof RateLimitedError ? t('rateLimited') : t('forgotFailed'))
        }
    }

    return { email, setEmail, status, error, submit }
}

export const useResetPasswordModel = (token: string) => {
    const t = useTranslations('passwordReset')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [status, setStatus] = useState<TStatus>('idle')
    const [error, setError] = useState('')
    const [linkInvalid, setLinkInvalid] = useState(!token)

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError('')
        if (password.length < MIN_PASSWORD_LENGTH) return setError(t('tooShort', { min: MIN_PASSWORD_LENGTH }))
        if (password !== confirm) return setError(t('mismatch'))

        setStatus('sending')
        try {
            await resetPassword(token, password)
            setStatus('done')
        } catch (err) {
            setStatus('idle')
            if (err instanceof InvalidResetLinkError) setLinkInvalid(true)
            else setError(err instanceof RateLimitedError ? t('rateLimited') : t('resetFailed'))
        }
    }

    return { password, setPassword, confirm, setConfirm, status, error, linkInvalid, submit }
}
