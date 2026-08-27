'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCommentsModel } from '../model'
import { LoginPromptModal } from '@/shared/ui'
import type { TCommentTarget } from '@/shared/api/comment'
import styles from './CommentsSection.module.css'

type TCommentsSectionProps = {
    target: TCommentTarget
    enabled: boolean
    // Logged-out visitors can see the composer (clicking it opens the login modal)
    // but never the existing comments.
    isLoggedIn?: boolean
    autoLoad?: boolean
    title?: string
    emptyMessage?: string
}

function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export const CommentsSection = ({
    target,
    enabled,
    isLoggedIn = true,
    autoLoad = true,
    title,
    emptyMessage,
}: TCommentsSectionProps) => {
    const t = useTranslations('comments')
    const [showLoginPrompt, setShowLoginPrompt] = useState(false)
    const resolvedTitle = title ?? t('defaultTitle')
    const resolvedEmptyMessage = emptyMessage ?? t('defaultEmpty')

    // Never fetch comments for logged-out visitors.
    const canView = enabled && isLoggedIn

    const {
        comments,
        isLoading,
        loadError,
        text,
        setText,
        isSubmitting,
        submitError,
        handleSubmit,
    } = useCommentsModel({ target, enabled: canView, autoLoad })

    if (!enabled) return null

    return (
        <div className={styles.comments}>
            <h4 className={styles.comments__title}>{resolvedTitle}</h4>

            {!isLoggedIn && (
                <p className={styles.comments__empty}>{t('loginToView')}</p>
            )}

            {isLoggedIn && isLoading && <p className={styles.comments__status}>{t('loading')}</p>}
            {isLoggedIn && loadError && <p className={styles.comments__error}>{loadError}</p>}

            {isLoggedIn && !isLoading && !loadError && comments.length === 0 && (
                <p className={styles.comments__empty}>{resolvedEmptyMessage}</p>
            )}

            {isLoggedIn && comments.length > 0 && (
                <ul className={styles.comments__list}>
                    {comments.map((comment) => (
                        <li key={comment.id} className={styles.comments__item}>
                            <div className={styles.comments__itemHeader}>
                                <span className={styles.comments__author}>{comment.authorName}</span>
                                <span className={styles.comments__time}>{formatTimestamp(comment.createdAt)}</span>
                            </div>
                            <p className={styles.comments__text}>{comment.text}</p>
                        </li>
                    ))}
                </ul>
            )}

            <form
                className={styles.comments__form}
                onSubmit={(e) => {
                    e.preventDefault()
                    if (!isLoggedIn) {
                        setShowLoginPrompt(true)
                        return
                    }
                    handleSubmit()
                }}
            >
                <textarea
                    className={styles.comments__input}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('placeholder')}
                    rows={2}
                    disabled={isSubmitting}
                />
                {submitError && <p className={styles.comments__error}>{submitError}</p>}
                <button
                    type="submit"
                    className={styles.comments__submit}
                    disabled={isSubmitting || (isLoggedIn && !text.trim())}
                >
                    {isSubmitting ? t('posting') : t('postComment')}
                </button>
            </form>

            <LoginPromptModal
                isOpen={showLoginPrompt}
                onClose={() => setShowLoginPrompt(false)}
                message={t('loginToPost')}
            />
        </div>
    )
}
