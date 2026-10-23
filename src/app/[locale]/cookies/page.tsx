import { getTranslations } from 'next-intl/server'

import { readLegalConfig } from '@/shared/lib/legal'
import { LegalDocument, type TLegalSection } from '@/shared/ui/LegalDocument'

export async function generateMetadata() {
    const t = await getTranslations('cookies')
    return { title: `${t('title')} — Kageo` }
}

export default async function Page() {
    const t = await getTranslations('cookies')
    const { contact, reviewed } = readLegalConfig()

    return (
        <LegalDocument
            title={t('title')}
            updated={t('updated')}
            sections={t.raw('sections') as TLegalSection[]}
            draftNotice={reviewed ? undefined : t('draftNotice')}
            contact={contact ? { label: t('contactLabel'), email: contact } : undefined}
        />
    )
}
