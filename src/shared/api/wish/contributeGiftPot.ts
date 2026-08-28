export type TGiftContributeResponse = {
    wishId: string
    totalContributed: number
    isFunded: boolean
}

export type TGiftSetContributionResponse = {
    wishId: string
    totalContributed: number
    myContribution: number
    isFunded: boolean
}

export const contributeGiftPot = async (
    wishId: string,
    amount: number,
): Promise<TGiftContributeResponse> => {
    const res = await fetch('/api/wish/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishId, amount }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TGiftContributeResponse
}

// Replace the caller's own pledge with `amount` (modify, not add). `0` removes it.
export const setGiftContribution = async (
    wishId: string,
    amount: number,
): Promise<TGiftSetContributionResponse> => {
    const res = await fetch('/api/wish/contribute', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishId, amount }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TGiftSetContributionResponse
}
