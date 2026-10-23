import { getTranslations } from 'next-intl/server'

import { ForgotPasswordForm } from '@/features/ResetPassword'

export async function generateMetadata() {
    const t = await getTranslations('passwordReset')
    return { title: `${t('forgotTitle')} — Kageo` }
}

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />
}
