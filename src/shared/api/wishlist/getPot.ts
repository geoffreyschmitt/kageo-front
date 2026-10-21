import { assertOk } from '../assertOk'

export type TPotContributor = { name: string; amount: number; lastContributedAt?: string; isOrganiser?: boolean }

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

    await assertOk(res)

    return (await res.json()) as TGetPotResponse
}
