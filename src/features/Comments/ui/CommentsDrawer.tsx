'use client'

import { useEffect, useState } from 'react'

import { useTranslations } from 'next-intl'

import { eventBus } from '@/shared/eventBus'

import styles from './CommentsDrawer.module.css'
import { CommentsSection } from './CommentsSection'

type TCommentsDrawerProps = {
    // Logged-out visitors may open the drawer (the composer prompts them to log in)
    // but never see existing comments — this mirrors CommentsSection's own gating.
    isLoggedIn?: boolean
    // Empty-state copy for the wishlist-level thread.
    emptyMessage?: string
}

type TThread = { kind: 'wish'; id: string; name: string } | { kind: 'wishlist'; id: string }

// Single instance mounted per wishlist page. WishCards emit `wish:openComments` and the
// sidebar preview emits `wishlist:openComments` to open it; the wishlist owner never
// triggers either because both entry points are hidden from them.
export const CommentsDrawer = ({ isLoggedIn = true, emptyMessage }: TCommentsDrawerProps) => {
    const t = useTranslations('comments')
    const [thread, setThread] = useState<TThread | null>(null)

    useEffect(
        () =>
            eventBus.on('wish:openComments', ({ wishId, wishName }) => {
                setThread({ kind: 'wish', id: wishId, name: wishName })
            }),
        [],
    )

    useEffect(
        () =>
            eventBus.on('wishlist:openComments', ({ wishlistId }) => {
                setThread({ kind: 'wishlist', id: wishlistId })
            }),
        [],
    )

    const close = () => setThread(null)

    // Lock body scroll and close on Escape while open.
    useEffect(() => {
        if (!thread) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close()
        }
        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = ''
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [thread])

    if (!thread) return null

    return (
        <div className={styles.wrap} role="dialog" aria-modal="true" aria-label={t('defaultTitle')}>
            <div className={styles.overlay} onClick={close} />
            <aside className={styles.drawer}>
                <div className={styles.head}>
                    <span className={styles.eyebrow}>{t('defaultTitle')}</span>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={close}
                        aria-label={t('close')}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>
                <div className={styles.body}>
                    <CommentsSection
                        target={
                            thread.kind === 'wish'
                                ? { type: 'wish', wishId: thread.id }
                                : { type: 'wishlist', wishlistId: thread.id }
                        }
                        enabled
                        isLoggedIn={isLoggedIn}
                        title={thread.kind === 'wish' ? thread.name : undefined}
                        emptyMessage={thread.kind === 'wishlist' ? emptyMessage : undefined}
                        fill
                        onCommentPosted={() =>
                            thread.kind === 'wish'
                                ? eventBus.emit('wish:commentCountChanged', { wishId: thread.id, delta: 1 })
                                : eventBus.emit('wishlist:commentPosted', { wishlistId: thread.id })
                        }
                    />
                </div>
            </aside>
        </div>
    )
}
