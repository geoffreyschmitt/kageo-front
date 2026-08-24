import { kv } from '@vercel/kv'

type TSessionUser = { id?: string; email?: string | null } | undefined

type TWishlistAccessInput = {
    id: string
    ownerId: string
    isPublic: boolean
}

// Comments (and similar guest-only surfaces) must never reach the owner —
// this always resolves isOwner separately from canView so callers can gate on it.
export async function getWishlistAccess(wishlist: TWishlistAccessInput, sessionUser: TSessionUser) {
    const isOwner = !!sessionUser?.id && sessionUser.id === wishlist.ownerId

    if (isOwner) {
        return { isOwner: true, canView: true }
    }

    if (wishlist.isPublic) {
        return { isOwner: false, canView: true }
    }

    const isInvited = sessionUser?.email
        ? Boolean(await kv.sismember(`wishlist:${wishlist.id}:invitees`, sessionUser.email.toLowerCase()))
        : false

    return { isOwner: false, canView: isInvited }
}
