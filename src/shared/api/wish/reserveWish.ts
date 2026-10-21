import { assertOk } from "../assertOk"

export type TReserveWishResponse = {
    id: string
    status: 'reserved'
    reservedBy: string
}

export const reserveWish = async (
    wishId: string,
    userId: string
): Promise<TReserveWishResponse> => {
    const res = await fetch("/api/wish/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId, userId }),
    })

    await assertOk(res)

    return (await res.json()) as TReserveWishResponse
}
