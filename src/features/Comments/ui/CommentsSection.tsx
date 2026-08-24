'use client'

import { useTranslations } from 'next-intl'
import { useCommentsModel } from '../model'
import type { TCommentTarget } from '@/shared/api/comment'
import styles from './CommentsSection.module.css'

type TCommentsSectionProps = {
    target: TCommentTarget
    enabled: boolean
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
    autoLoad = true,
    title,
    emptyMessage,
}: TCommentsSectionProps) => {
    const t = useTranslations('comments')
    const resolvedTitle = title ?? t('defaultTitle')
    const resolvedEmptyMessage = emptyMessage ?? t('defaultEmpty')

    const {
        comments,
        isLoading,
        loadError,
        text,
        setText,
        isSubmitting,
        submitError,
        handleSubmit,
    } = useCommentsModel({ target, enabled, autoLoad })

    if (!enabled) return null

    return (
        <div className={styles.comments}>
            <h4 className={styles.comments__title}>{resolvedTitle}</h4>

            {isLoading && <p className={styles.comments__status}>{t('loading')}</p>}
            {loadError && <p className={styles.comments__error}>{loadError}</p>}

            {!isLoading && !loadError && comments.length === 0 && (
                <p className={styles.comments__empty}>{resolvedEmptyMessage}</p>
            )}

            {comments.length > 0 && (
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
                    disabled={isSubmitting || !text.trim()}
                >
                    {isSubmitting ? t('posting') : t('postComment')}
                </button>
            </form>
        </div>
    )
}
