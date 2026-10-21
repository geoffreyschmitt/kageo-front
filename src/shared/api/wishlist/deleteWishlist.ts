import { assertOk } from '../assertOk'

export type TDeleteWishlistResponse = {
    id: string
    deleted: true
}

export const deleteWishlist = async (
    wishlistId: string
): Promise<TDeleteWishlistResponse> => {
    const res = await fetch(`/api/wishlist/${wishlistId}`, {
        method: 'DELETE',
    })

    await assertOk(res)

    return (await res.json()) as TDeleteWishlistResponse
}
