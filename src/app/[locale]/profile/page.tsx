import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import ProfilePage from '@/views/profile/ui/ProfilePage'

export async function generateMetadata() {
    const t = await getTranslations('metadata')
    return { title: t('profileTitle') }
}

export default async function Page() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/')

    return <ProfilePage />
}
