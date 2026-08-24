import type { TComment } from '@/entities/comment'
import type { TCommentTarget } from './getComments'

const urlFor = (target: TCommentTarget) =>
    target.type === 'wishlist'
        ? `/api/wishlist/${target.wishlistId}/comments`
        : `/api/wish/${target.wishId}/comments`

export const postComment = async (target: TCommentTarget, text: string): Promise<TComment> => {
    const res = await fetch(urlFor(target), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    })

    if (!res.ok) {
        const data = await res.json().catch(() => ({ message: '' }))
        throw new Error(data.message || `API error ${res.status}`)
    }

    return (await res.json()) as TComment
}
