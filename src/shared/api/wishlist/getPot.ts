export type TPotContributor = { name: string; amount: number }

export type TGetPotResponse = {
    creatorId?: string
    creatorName: string
    totalContributed: number
    myContribution?: number
    contributors?: TPotContributor[]
}

export const getPot = async (wishlistId: string): Promise<TGetPotResponse | null> => {
    const res = await fetch(`/api/wishlist/pot?wishlistId=${encodeURIComponent(wishlistId)}`)

    if (res.status === 404) return null

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TGetPotResponse
}
