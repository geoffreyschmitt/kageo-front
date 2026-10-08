import { getTranslations } from 'next-intl/server'

import styles from './page.module.css'

type TSection = { title: string; paragraphs?: string[]; items?: string[] }

export async function generateMetadata() {
    const t = await getTranslations('privacy')
    return { title: `${t('title')} — Kageo` }
}

// The policy text lives in the `privacy` i18n namespace. Two env vars complete it:
// NEXT_PUBLIC_PRIVACY_CONTACT (shown as the contact) and NEXT_PUBLIC_PRIVACY_REVIEWED=1
// (set once a lawyer has signed off, which removes the draft notice).
export default async function PrivacyPage() {
    const t = await getTranslations('privacy')
    const sections = t.raw('sections') as TSection[]
    const contact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT
    const reviewed = process.env.NEXT_PUBLIC_PRIVACY_REVIEWED === '1'

    return (
        <main className={styles.page}>
            <article className={styles.article}>
                <h1 className={styles.title}>{t('title')}</h1>
                <p className={styles.updated}>{t('updated')}</p>
                {!reviewed && (
                    <p className={styles.draft} role="note">
                        {t('draftNotice')}
                    </p>
                )}

                {sections.map((section) => (
                    <section key={section.title} className={styles.section}>
                        <h2 className={styles.heading}>{section.title}</h2>
                        {section.paragraphs?.map((text) => (
                            <p key={text} className={styles.text}>
                                {text}
                            </p>
                        ))}
                        {section.items && (
                            <ul className={styles.list}>
                                {section.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}

                {contact && (
                    <section className={styles.section}>
                        <h2 className={styles.heading}>{t('contactLabel')}</h2>
                        <p className={styles.text}>
                            <a href={`mailto:${contact}`} className={styles.link}>
                                {contact}
                            </a>
                        </p>
                    </section>
                )}
            </article>
        </main>
    )
}
