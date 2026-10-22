import type { TComment } from '@/entities/comment'

import { assertOk } from '../assertOk'

export type TCommentTarget =
    | { type: 'wishlist'; wishlistId: string }
    | { type: 'wish'; wishId: string }
    | { type: 'safeBet'; wishlistId: string; entryId: string }

export const urlFor = (target: TCommentTarget) => {
    switch (target.type) {
        case 'wishlist':
            return `/api/wishlist/${target.wishlistId}/comments`
        case 'wish':
            return `/api/wish/${target.wishId}/comments`
        case 'safeBet':
            return `/api/wishlist/${target.wishlistId}/safe-bets/${target.entryId}/comments`
    }
}

export const getComments = async (target: TCommentTarget): Promise<TComment[]> => {
    const res = await fetch(urlFor(target))

    // Loaded on page open: a non-invited viewer gets the notice in the comments area, not a toast.
    await assertOk(res, { notifyNotInvited: false })

    return (await res.json()) as TComment[]
}
