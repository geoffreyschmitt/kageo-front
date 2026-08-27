'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { eventBus } from '@/shared/eventBus'

import { CommentsSection } from './CommentsSection'
import styles from './CommentsDrawer.module.css'

type TCommentsDrawerProps = {
    // Logged-out visitors may open the drawer (the composer prompts them to log in)
    // but never see existing comments — this mirrors CommentsSection's own gating.
    isLoggedIn?: boolean
}

// Single instance mounted per wishlist page. WishCards emit `wish:openComments`
// to open it; the wishlist owner never triggers it because the card entry point
// is hidden from them.
export const CommentsDrawer = ({ isLoggedIn = true }: TCommentsDrawerProps) => {
    const t = useTranslations('comments')
    const [wish, setWish] = useState<{ id: string; name: string } | null>(null)

    useEffect(
        () =>
            eventBus.on('wish:openComments', ({ wishId, wishName }) => {
                setWish({ id: wishId, name: wishName })
            }),
        [],
    )

    const close = () => setWish(null)

    // Lock body scroll and close on Escape while open.
    useEffect(() => {
        if (!wish) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close()
        }
        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = ''
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [wish])

    if (!wish) return null

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
                        target={{ type: 'wish', wishId: wish.id }}
                        enabled
                        isLoggedIn={isLoggedIn}
                        title={wish.name}
                        fill
                        onCommentPosted={() =>
                            eventBus.emit('wish:commentCountChanged', { wishId: wish.id, delta: 1 })
                        }
                    />
                </div>
            </aside>
        </div>
    )
}
