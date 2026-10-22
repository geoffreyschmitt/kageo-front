'use client'

import { useState } from 'react'

import Image from 'next/image'

import { useTranslations } from 'next-intl'

import { CommentsSection } from '@/features/Comments'

import type { TSafeBet } from '@/entities/safeBet'

import styles from './SafeBetsSection.module.css'

export type TSafeBetEntry = TSafeBet & { commentCount: number }

type TSafeBetsSectionProps = {
    wishlistId: string
    entries: TSafeBetEntry[]
    isLoggedIn: boolean
}

type TEntryProps = { wishlistId: string; entry: TSafeBetEntry; isLoggedIn: boolean }

const SafeBetEntry = ({ wishlistId, entry, isLoggedIn }: TEntryProps) => {
    const t = useTranslations('comments')
    const [open, setOpen] = useState(false)
    const [count, setCount] = useState(entry.commentCount)
    const [imgError, setImgError] = useState(false)
    const panelId = `safebet-thread-${entry.id}`

    return (
        <li className={styles.entry}>
            <div className={styles.entry__main}>
                {entry.imageUrl && !imgError && (
                    <Image
                        src={entry.imageUrl}
                        alt=""
                        width={96}
                        height={96}
                        className={styles.entry__image}
                        onError={() => setImgError(true)}
                    />
                )}
                <div className={styles.entry__text}>
                    <h3 className={styles.entry__title}>{entry.title}</h3>
                    {entry.description && <p className={styles.entry__description}>{entry.description}</p>}
                </div>
            </div>
            <button
                type="button"
                className={styles.entry__toggle}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((v) => !v)}
            >
                {count > 0 ? t('count', { count }) : t('addCta')}
            </button>
            {open && (
                <div id={panelId} className={styles.entry__thread}>
                    <CommentsSection
                        target={{ type: 'safeBet', wishlistId, entryId: entry.id }}
                        enabled
                        isLoggedIn={isLoggedIn}
                        title={entry.title}
                        onCommentPosted={() => setCount((c) => c + 1)}
                    />
                </div>
            )}
        </li>
    )
}

// The owner's "safe bet" ideas, shown to guests under a shared wishlist. The page passes an empty
// list to the owner (comments never reach them), in which case nothing is rendered.
export const SafeBetsSection = ({ wishlistId, entries, isLoggedIn }: TSafeBetsSectionProps) => {
    const t = useTranslations('safeBets')
    if (entries.length === 0) return null

    return (
        <section className={styles.section} aria-labelledby="safebets-heading">
            <h2 id="safebets-heading" className={styles.section__title}>
                {t('guestTitle')}
            </h2>
            <ul className={styles.list}>
                {entries.map((entry) => (
                    <SafeBetEntry key={entry.id} wishlistId={wishlistId} entry={entry} isLoggedIn={isLoggedIn} />
                ))}
            </ul>
        </section>
    )
}
