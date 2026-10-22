import { NextResponse } from 'next/server'

import { kv } from '@vercel/kv'

type TSessionUser = { id?: string; email?: string | null } | undefined

type TWishlistAccessInput = {
    id: string
    ownerId: string
    isPublic: boolean
}

// 403 for someone signed in who is not allowed to act on a private list. The code lets the
// client say "ask to be invited" instead of showing a bare error.
export const notInvitedResponse = () =>
    NextResponse.json({ message: 'Forbidden', code: 'NOT_INVITED' }, { status: 403 })

// Reading a list needs no account for public and private lists alike (the link is the secret),
// so `canView` is always true. Acting (reserve, comment, pledge, suggest, start a pot) is
// `canAct`: the owner, anyone on a public list, or an invited email on a private one.
// Comments (and similar guest-only surfaces) must never reach the owner — this always resolves
// isOwner separately so callers can gate on it.
export async function getWishlistAccess(wishlist: TWishlistAccessInput, sessionUser: TSessionUser) {
    const isOwner = !!sessionUser?.id && sessionUser.id === wishlist.ownerId

    if (isOwner) {
        return { isOwner: true, canView: true as const, canAct: true }
    }

    if (wishlist.isPublic) {
        return { isOwner: false, canView: true as const, canAct: true }
    }

    const isInvited = sessionUser?.email
        ? Boolean(await kv.sismember(`wishlist:${wishlist.id}:invitees`, sessionUser.email.toLowerCase()))
        : false

    return { isOwner: false, canView: true as const, canAct: isInvited }
}
