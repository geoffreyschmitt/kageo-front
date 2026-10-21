import { assertOk } from "../assertOk"

export type TRemovePurchasedWishResponse = {
    id: string
    status: 'wanted' | 'reserved' | 'funded'
    purchasedBy: undefined
}

export const removePurchased = async (
    wishId: string
): Promise<TRemovePurchasedWishResponse> => {
    const res = await fetch("/api/wish/remove-purchased", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId }),
    })

    await assertOk(res)

    return (await res.json()) as TRemovePurchasedWishResponse
}
