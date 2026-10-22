import type { TComment } from '@/entities/comment'

import { eventBus } from '@/shared/eventBus'

import { type TCommentTarget, urlFor } from './getComments'

export const postComment = async (target: TCommentTarget, text: string): Promise<TComment> => {
    const res = await fetch(urlFor(target), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    })

    if (!res.ok) {
        if (res.status === 429) eventBus.emit('ui:rateLimited', {})
        const data = await res.json().catch(() => ({ message: '' }))
        throw new Error(data.message || `API error ${res.status}`)
    }

    return (await res.json()) as TComment
}
