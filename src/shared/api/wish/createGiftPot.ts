export type TCreateGiftPotResponse = {
    creatorId: string
    creatorName: string
    createdAt: string
}

export const createGiftPot = async (wishId: string): Promise<TCreateGiftPotResponse> => {
    const res = await fetch('/api/wish/pot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishId }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TCreateGiftPotResponse
}
