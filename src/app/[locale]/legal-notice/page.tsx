import { getTranslations } from 'next-intl/server'

import { readLegalConfig } from '@/shared/lib/legal'
import { LegalDocument, type TLegalSection } from '@/shared/ui/LegalDocument'

export async function generateMetadata() {
    const t = await getTranslations('legalNotice')
    return { title: `${t('title')} — Kageo` }
}

// Mentions légales (LCEN art. 6): the publisher is set with NEXT_PUBLIC_LEGAL_PUBLISHER.
export default async function LegalNoticePage() {
    const t = await getTranslations('legalNotice')
    const { contact, reviewed, publisher } = readLegalConfig()
    const who = publisher || t('toComplete')
    const where = contact || t('toComplete')

    const sections: TLegalSection[] = [
        { title: t('publisherTitle'), paragraphs: [t('publisherText', { publisher: who }), t('publisherContact', { contact: where })] },
        { title: t('directorTitle'), paragraphs: [t('directorText', { publisher: who })] },
        { title: t('hostTitle'), paragraphs: [t('hostText')] },
        { title: t('dataTitle'), paragraphs: [t('dataText')] },
    ]

    return (
        <LegalDocument
            title={t('title')}
            updated={t('updated')}
            sections={sections}
            draftNotice={reviewed && publisher ? undefined : t('draftNotice')}
        />
    )
}
