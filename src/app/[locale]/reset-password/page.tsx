import { getTranslations } from 'next-intl/server'

import { ResetPasswordForm } from '@/features/ResetPassword'

export async function generateMetadata() {
    const t = await getTranslations('passwordReset')
    // The link carries a secret token: keep it out of the Referer header sent to other sites.
    return { title: `${t('resetTitle')} — Kageo`, referrer: 'no-referrer' as const, robots: { index: false } }
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams
    return <ResetPasswordForm token={typeof token === 'string' ? token : ''} />
}
