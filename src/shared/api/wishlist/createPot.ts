export type TCreatePotResponse = {
    creatorId: string
    creatorName: string
    createdAt: string
}

export const createPot = async (wishlistId: string): Promise<TCreatePotResponse> => {
    const res = await fetch('/api/wishlist/pot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlistId }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TCreatePotResponse
}
