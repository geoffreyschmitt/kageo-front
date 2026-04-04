export type TDeleteWishResponse = {
    id: string
    deleted: true
}

export const deleteWish = async (
    wishId: string
): Promise<TDeleteWishResponse> => {
    const res = await fetch("/api/wish/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TDeleteWishResponse
}
