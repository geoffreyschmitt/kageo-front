import type { TComment } from '@/entities/comment'

export type TCommentTarget = { type: 'wishlist'; wishlistId: string } | { type: 'wish'; wishId: string }

const urlFor = (target: TCommentTarget) =>
    target.type === 'wishlist'
        ? `/api/wishlist/${target.wishlistId}/comments`
        : `/api/wish/${target.wishId}/comments`

export const getComments = async (target: TCommentTarget): Promise<TComment[]> => {
    const res = await fetch(urlFor(target))

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TComment[]
}
