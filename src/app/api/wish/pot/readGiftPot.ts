import { kv } from '@vercel/kv'

import type { TGiftPotView, TGiftPotContributor } from '@/shared/api/wish/getGiftPot'
import { parseContributions } from '@/app/api/wishlist/pot/readPot'

type TWishKV = { id: string; wishlistId: string; price: number; status: string }
type TWishlistKV = { id: string; ownerId: string }
type TPotKV = { creatorId: string; creatorName: string; createdAt: string }
type TUserKV = { id: string; email: string; name: string }

// Server-only. Role-shaped read of a wish's gift pot. Shared by
// GET /api/wish/pot and the wishlist page server component so the visibility
// rules live in one place.
//   - wishlist owner            → null (the pot is a surprise)
//   - no pot / no wish / no list → null
//   - any other viewer          → totals + participant count + goal + isFunded
//   - pot creator               → + the nominative contributor list
export const readGiftPotForViewer = async ({
    wishId,
    userId,
}: {
    wishId: string
    userId: string | null
}): Promise<TGiftPotView | null> => {
    const [wish, pot] = await Promise.all([
        kv.get<TWishKV>(`wish:${wishId}`),
        kv.get<TPotKV>(`wish:${wishId}:pot`),
    ])
    if (!wish || !pot) return null

    const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
    if (!wishlist) return null
    if (userId && wishlist.ownerId === userId) return null

    const goal = wish.price ?? 0

    const contributions = parseContributions(
        await kv.lrange<string>(`wish:${wishId}:contributions`, 0, -1),
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
    const positive = Array.from(byUser.entries()).filter(([, v]) => v.amount > 0)

    const totalContributed = positive.reduce((sum, [, v]) => sum + v.amount, 0)
    const participantCount = positive.length
    const myContribution = userId ? byUser.get(userId)?.amount ?? 0 : 0
    const isCreator = !!userId && pot.creatorId === userId

    const base: TGiftPotView = {
        creatorName: pot.creatorName,
        isCreator,
        goal,
        totalContributed,
        isFunded: goal > 0 && totalContributed >= goal,
        myContribution,
        participantCount,
    }
    if (!isCreator) return base

    const contributors: TGiftPotContributor[] = await Promise.all(
        positive.map(async ([uid, { amount, last }]) => {
            const email = await kv.get<string>(`user:id:${uid}`)
            const user = email ? await kv.get<TUserKV>(`user:${email}`) : null
            return { name: user?.name ?? 'Anonymous', amount, lastContributedAt: last }
        }),
    )
    contributors.sort((a, b) => b.amount - a.amount)

    return { ...base, creatorId: pot.creatorId, contributors }
}
