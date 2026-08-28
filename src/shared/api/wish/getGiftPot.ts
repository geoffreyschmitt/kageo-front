export type TGiftPotContributor = { name: string; amount: number; lastContributedAt?: string }

export type TGiftPotView = {
    creatorId?: string
    creatorName: string
    isCreator?: boolean
    goal: number
    totalContributed: number
    isFunded: boolean
    myContribution?: number
    participantCount?: number
    contributors?: TGiftPotContributor[]
}

export const getGiftPot = async (wishId: string): Promise<TGiftPotView | null> => {
    const res = await fetch(`/api/wish/pot?wishId=${encodeURIComponent(wishId)}`)

    if (res.status === 404) return null

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TGiftPotView
}
