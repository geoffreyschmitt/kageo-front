import { kv } from '@vercel/kv'

// Server-only helper: reads the pot for a given viewer and returns a
// role-shaped view. Shared by GET /api/wishlist/pot and the wishlist page
// server component so the visibility rules live in exactly one place.
//
// Rules:
//   - owner            → null (the pot is a surprise, never exposed)
//   - no pot / no list → null
//   - anyone else      → totals + participant count
//   - pot creator      → + the full nominative contributor list

type TWishlistKV = {
    id: string
    ownerId: string
    totalContributed?: number
}

type TPotKV = {
    creatorId: string
    creatorName: string
    createdAt: string
}

type TContribution = {
    userId: string
    amount: number
    contributedAt: string
}

type TUserKV = {
    id: string
    email: string
    name: string
}

export type TPotContributorDetail = {
    name: string
    amount: number
    lastContributedAt: string
}

export type TPotView = {
    creatorName: string
    creatorId?: string
    isCreator: boolean
    totalContributed: number
    myContribution: number
    participantCount: number
    contributors?: TPotContributorDetail[]
}

export const parseContributions = (raw: (string | TContribution)[] | null): TContribution[] =>
    (raw ?? []).map((c) => (typeof c === 'string' ? (JSON.parse(c) as TContribution) : c))

export const readPotForViewer = async ({
    wishlistId,
    userId,
}: {
    wishlistId: string
    userId: string | null
}): Promise<TPotView | null> => {
    const [wishlist, pot] = await Promise.all([
        kv.get<TWishlistKV>(`wishlist:${wishlistId}`),
        kv.get<TPotKV>(`wishlist:${wishlistId}:pot`),
    ])

    if (!wishlist || !pot) return null

    // The pot is hidden from the wishlist owner entirely.
    if (userId && wishlist.ownerId === userId) return null

    const totalContributed = wishlist.totalContributed ?? 0

    const contributions = parseContributions(
        await kv.lrange<string>(`wishlist:${wishlistId}:contributions`, 0, -1),
    )

    const byUser = new Map<string, { amount: number; last: string }>()
    for (const c of contributions) {
        const current = byUser.get(c.userId)
        if (current) {
            current.amount += c.amount
            if (c.contributedAt > current.last) current.last = c.contributedAt
        } else {
            byUser.set(c.userId, { amount: c.amount, last: c.contributedAt })
        }
    }

    const participantCount = byUser.size
    const myContribution = userId ? byUser.get(userId)?.amount ?? 0 : 0
    const isCreator = !!userId && pot.creatorId === userId

    const base: TPotView = {
        creatorName: pot.creatorName,
        isCreator,
        totalContributed,
        myContribution,
        participantCount,
    }

    if (!isCreator) return base

    const contributors: TPotContributorDetail[] = await Promise.all(
        Array.from(byUser.entries()).map(async ([uid, { amount, last }]) => {
            const email = await kv.get<string>(`user:id:${uid}`)
            const user = email ? await kv.get<TUserKV>(`user:${email}`) : null
            return { name: user?.name ?? 'Anonymous', amount, lastContributedAt: last }
        }),
    )
    contributors.sort((a, b) => b.amount - a.amount)

    return { ...base, creatorId: pot.creatorId, contributors }
}
