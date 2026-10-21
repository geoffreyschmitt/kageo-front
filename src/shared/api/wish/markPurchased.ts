import { assertOk } from "../assertOk"

export type TMarkPurchasedWishResponse = {
    id: string
    status: 'purchased'
    purchasedBy: string
}

export const markPurchased = async (
    wishId: string,
    userId: string
): Promise<TMarkPurchasedWishResponse> => {
    const res = await fetch("/api/wish/mark-purchased", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId, userId }),
    })

    await assertOk(res)

    return (await res.json()) as TMarkPurchasedWishResponse
}
