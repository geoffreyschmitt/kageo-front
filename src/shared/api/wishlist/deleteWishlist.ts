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

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TDeleteWishlistResponse
}
