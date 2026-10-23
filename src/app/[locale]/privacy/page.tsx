import { getTranslations } from 'next-intl/server'

import { readLegalConfig } from '@/shared/lib/legal'
import { LegalDocument, type TLegalSection } from '@/shared/ui/LegalDocument'

export async function generateMetadata() {
    const t = await getTranslations('privacy')
    return { title: `${t('title')} — Kageo` }
}

// The policy text lives in the `privacy` i18n namespace; the contact and the draft
// notice come from the env (see `shared/lib/legal.ts`).
export default async function PrivacyPage() {
    const t = await getTranslations('privacy')
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
