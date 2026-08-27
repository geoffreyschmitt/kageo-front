export type TWishlistContributeResponse = {
    wishlistId: string
    totalContributed: number
    contribution: { userId: string; amount: number; contributedAt: string }
}

export type TWishlistSetContributionResponse = {
    wishlistId: string
    totalContributed: number
    myContribution: number
}

export const contributePot = async (
    wishlistId: string,
    amount: number,
): Promise<TWishlistContributeResponse> => {
    const res = await fetch('/api/wishlist/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlistId, amount }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TWishlistContributeResponse
}

// Replace the caller's own pledge with `amount` (modify, not add).
export const setContribution = async (
    wishlistId: string,
    amount: number,
): Promise<TWishlistSetContributionResponse> => {
    const res = await fetch('/api/wishlist/contribute', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlistId, amount }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TWishlistSetContributionResponse
}
