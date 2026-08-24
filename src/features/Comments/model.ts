'use client'

import { useCallback, useEffect, useState } from 'react'

import { getComments, postComment, TCommentTarget } from '@/shared/api/comment'
import type { TComment } from '@/entities/comment'

type TUseCommentsModelParams = {
    target: TCommentTarget
    // Comments must never be fetched for the wishlist owner — callers gate this explicitly
    // rather than relying on the API's 403, so the UI never even attempts the request.
    enabled: boolean
    autoLoad?: boolean
}

export const useCommentsModel = ({ target, enabled, autoLoad = true }: TUseCommentsModelParams) => {
    const [comments, setComments] = useState<TComment[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [hasLoaded, setHasLoaded] = useState(false)

    const [text, setText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const targetKey = target.type === 'wishlist' ? target.wishlistId : target.wishId

    const load = useCallback(async () => {
        if (!enabled) return
        setIsLoading(true)
        setLoadError(null)
        try {
            const data = await getComments(target)
            setComments(data)
            setHasLoaded(true)
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Could not load comments')
        } finally {
            setIsLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, targetKey, target.type])

    useEffect(() => {
        setComments([])
        setHasLoaded(false)
        if (enabled && autoLoad) {
            load()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, autoLoad, targetKey])

    const handleSubmit = useCallback(async () => {
        if (!text.trim()) return
        setIsSubmitting(true)
        setSubmitError(null)
        try {
            const comment = await postComment(target, text.trim())
            setComments((prev) => [...prev, comment])
            setText('')
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Could not post comment')
        } finally {
            setIsSubmitting(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, targetKey, target.type])

    return {
        comments,
        isLoading,
        loadError,
        hasLoaded,
        load,
        text,
        setText,
        isSubmitting,
        submitError,
        handleSubmit,
    }
}
