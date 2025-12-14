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

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TReserveWishResponse
}



