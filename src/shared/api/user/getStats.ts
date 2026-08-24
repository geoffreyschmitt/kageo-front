export type TUserStats = {
    wishlists: number
    wishes: number
    shared: number
}

export const getStats = async (): Promise<TUserStats> => {
    const res = await fetch('/api/user/stats')

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TUserStats
}
