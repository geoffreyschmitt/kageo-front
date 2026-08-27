export type TPotContributor = { name: string; amount: number; lastContributedAt?: string }

export type TGetPotResponse = {
    creatorId?: string
    creatorName: string
    isCreator?: boolean
    totalContributed: number
    myContribution?: number
    participantCount?: number
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
