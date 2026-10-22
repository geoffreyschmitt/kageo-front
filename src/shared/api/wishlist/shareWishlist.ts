import { assertOk } from '../assertOk'

export type TShareWishlistResponse = { ok: true; alreadyInvited: boolean }

export type TShareWishlistErrorCode = 'EMAIL_REJECTED' | 'EMAIL_UNAVAILABLE'

// The email could not be sent: the address was refused, or the email service is unavailable.
export class ShareWishlistError extends Error {
    constructor(public readonly code: TShareWishlistErrorCode) {
        super(code)
        this.name = 'ShareWishlistError'
    }
}

export const shareWishlist = async (
    wishlistId: string,
    email: string,
    locale: string,
): Promise<TShareWishlistResponse> => {
    const res = await fetch('/api/wishlist/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlistId, email, locale }),
    })

    if (res.status === 422 || res.status === 503) {
        const body = (await res.clone().json().catch(() => ({}))) as { code?: string }
        if (body.code === 'EMAIL_REJECTED' || body.code === 'EMAIL_UNAVAILABLE') throw new ShareWishlistError(body.code)
    }

    await assertOk(res)

    return (await res.json()) as TShareWishlistResponse
}
