'use client'

import { useEffect } from 'react'

import { useTranslations } from 'next-intl'

import { eventBus } from '@/shared/eventBus'

import { useCommentsModel } from '../model'

import styles from './CommentsPreview.module.css'

type TCommentsPreviewProps = {
    wishlistId: string
    isLoggedIn?: boolean
    emptyMessage?: string
}

const PREVIEW_COUNT = 2

// Compact wishlist-level thread for the sidebar: the latest comments plus a button
// that opens the full thread (and the composer) in the comments drawer.
export const CommentsPreview = ({ wishlistId, isLoggedIn = true, emptyMessage }: TCommentsPreviewProps) => {
    const t = useTranslations('comments')
    const { comments, isLoading, notInvited, load } = useCommentsModel({
        target: { type: 'wishlist', wishlistId },
        enabled: isLoggedIn,
    })

    // The drawer owns posting; refresh the preview when a comment lands.
    useEffect(
        () =>
            eventBus.on('wishlist:commentPosted', (payload) => {
                if (payload.wishlistId === wishlistId) load()
            }),
        [wishlistId, load],
    )

    if (notInvited) return null

    const latest = comments.slice(-PREVIEW_COUNT)
    const open = () => eventBus.emit('wishlist:openComments', { wishlistId })

    return (
        <section className={styles.preview} aria-label={t('defaultTitle')}>
            <h2 className={styles.preview__title}>
                {t('defaultTitle')}
                {comments.length > 0 && <span className={styles.preview__count}>{comments.length}</span>}
            </h2>

            {isLoggedIn && isLoading && comments.length === 0 && <p className={styles.preview__empty}>{t('loading')}</p>}

            {isLoggedIn && !isLoading && comments.length === 0 && (
                <p className={styles.preview__empty}>{emptyMessage ?? t('defaultEmpty')}</p>
            )}

            {latest.length > 0 && (
                <ul className={styles.preview__list}>
                    {latest.map((comment) => (
                        <li key={comment.id} className={styles.preview__item}>
                            <span className={styles.preview__author}>{comment.authorName}</span>
                            <p className={styles.preview__text}>{comment.text}</p>
                        </li>
                    ))}
                </ul>
            )}

            <button type="button" className={styles.preview__open} onClick={open}>
                {comments.length > PREVIEW_COUNT
                    ? t('viewAll', { count: comments.length })
                    : comments.length > 0
                      ? t('openThread')
                      : t('startThread')}
            </button>
        </section>
    )
}
