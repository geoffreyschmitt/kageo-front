export type TMarkPurchasedWishResponse = {
    id: string
    status: 'purchased'
}

export const markPurchased = async (
    wishId: string
): Promise<TMarkPurchasedWishResponse> => {
    const res = await fetch("/api/wish/mark-purchased", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TMarkPurchasedWishResponse
}
