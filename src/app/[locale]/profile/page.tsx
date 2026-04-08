import { getTranslations } from 'next-intl/server'
import ProfilePage from '@/pages/profile/ui/ProfilePage'

export async function generateMetadata() {
    const t = await getTranslations('metadata')
    return { title: t('profileTitle') }
}

export default function Page() {
    return <ProfilePage />
}
