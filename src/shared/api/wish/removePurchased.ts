export type TRemovePurchasedWishResponse = {
    id: string
    status: 'wanted'
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

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TRemovePurchasedWishResponse
}
