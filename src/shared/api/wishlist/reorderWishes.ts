import { assertOk } from '../assertOk'

export type TReorderWishesResponse = {
    order: string[]
}

export const reorderWishes = async (
    wishlistId: string,
    order: string[]
): Promise<TReorderWishesResponse> => {
    const res = await fetch(`/api/wishlist/${wishlistId}/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
    })

    await assertOk(res)

    return (await res.json()) as TReorderWishesResponse
}
