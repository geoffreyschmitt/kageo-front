import styles from './LegalDocument.module.css'

export type TLegalSection = { title: string; paragraphs?: string[]; items?: string[] }

type TProps = {
    title: string
    updated: string
    sections: TLegalSection[]
    /** Shown as a draft notice until the review flag is set. */
    draftNotice?: string
    contact?: { label: string; email: string }
}

export const LegalDocument = ({ title, updated, sections, draftNotice, contact }: TProps) => (
    <main className={styles.page}>
        <article className={styles.article}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.updated}>{updated}</p>
            {draftNotice && (
                <p className={styles.draft} role="note">
                    {draftNotice}
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
                    <h2 className={styles.heading}>{contact.label}</h2>
                    <p className={styles.text}>
                        <a href={`mailto:${contact.email}`} className={styles.link}>
                            {contact.email}
                        </a>
                    </p>
                </section>
            )}
        </article>
    </main>
)
