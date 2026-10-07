import { kv } from '@vercel/kv'

import { reconcileFundedStatus } from '@/app/api/wish/pot/reconcileFundedStatus'
import { parseContributions } from '@/app/api/wishlist/pot/readPot'
import { queueListReplace, queueWishlistDeletion, scanKeys } from '@/shared/lib/kvCascade'

type TWishKV = {
    id: string
    status: string
    price?: number
    reservedBy?: string
    purchasedBy?: string
    proposedBy?: string
}
type TWishlistKV = { id: string; totalContributed?: number }
type TPotKV = { creatorId: string }
type TOwned = { wishlists: Set<string>; wishes: Set<string> }

// `wish:{id}:suffix` / `wishlist:{id}:suffix` -> id
const idOf = (key: string): string => key.split(':')[1]

const toRaw = (entry: unknown): string => (typeof entry === 'string' ? entry : JSON.stringify(entry))

const parseAuthorId = (entry: unknown): string | null => {
    try {
        const value = typeof entry === 'string' ? JSON.parse(entry) : entry
        return (value as { authorId?: string })?.authorId ?? null
    } catch {
        return null
    }
}

const totalOf = (contributions: { userId: string; amount: number }[]): number => {
    const byUser = new Map<string, number>()
    for (const c of contributions) byUser.set(c.userId, (byUser.get(c.userId) ?? 0) + c.amount)
    return Array.from(byUser.values()).filter((v) => v > 0).reduce((s, v) => s + v, 0)
}

// Pots the user organises on other people's content. Pledges are only intentions
// (no money moves through Kageo), so the pot goes away with its organiser.
const dropOrganisedPots = async (userId: string, owned: TOwned) => {
    for (const key of await scanKeys('wishlist:*:pot')) {
        const wishlistId = idOf(key)
        if (owned.wishlists.has(wishlistId)) continue
        const pot = await kv.get<TPotKV>(key)
        if (pot?.creatorId !== userId) continue

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
        const tx = kv.multi()
        tx.del(key, `wishlist:${wishlistId}:contributions`)
        if (wishlist) tx.set(`wishlist:${wishlistId}`, { ...wishlist, totalContributed: 0 })
        await tx.exec()
    }

    for (const key of await scanKeys('wish:*:pot')) {
        const wishId = idOf(key)
        if (owned.wishes.has(wishId)) continue
        const pot = await kv.get<TPotKV>(key)
        if (pot?.creatorId !== userId) continue

        const wish = await kv.get<TWishKV>(`wish:${wishId}`)
        const tx = kv.multi()
        tx.del(key, `wish:${wishId}:contributions`)
        if (wish?.status === 'funded') tx.set(`wish:${wishId}`, { ...wish, status: 'wanted' })
        await tx.exec()
    }
}

// Pledges the user made to pots they don't organise.
const dropPledges = async (userId: string, owned: TOwned) => {
    for (const key of await scanKeys('wishlist:*:contributions')) {
        const wishlistId = idOf(key)
        if (owned.wishlists.has(wishlistId)) continue

        const all = parseContributions((await kv.lrange<string>(key, 0, -1)) ?? [])
        const mine = all.filter((c) => c.userId === userId)
        if (!mine.length) continue

        const myTotal = mine.reduce((s, c) => s + c.amount, 0)
        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
        const tx = kv.multi()
        queueListReplace(tx, key, all.filter((c) => c.userId !== userId).map((c) => JSON.stringify(c)))
        if (wishlist) {
            tx.set(`wishlist:${wishlistId}`, {
                ...wishlist,
                totalContributed: Math.max(0, (wishlist.totalContributed ?? 0) - myTotal),
            })
        }
        await tx.exec()
    }

    for (const key of await scanKeys('wish:*:contributions')) {
        const wishId = idOf(key)
        if (owned.wishes.has(wishId)) continue

        const all = parseContributions((await kv.lrange<string>(key, 0, -1)) ?? [])
        if (!all.some((c) => c.userId === userId)) continue

        const rest = all.filter((c) => c.userId !== userId)
        const wish = await kv.get<TWishKV>(`wish:${wishId}`)
        const tx = kv.multi()
        queueListReplace(tx, key, rest.map((c) => JSON.stringify(c)))
        if (wish) {
            const next = reconcileFundedStatus(wish.status, totalOf(rest), wish.price ?? 0)
            if (next) tx.set(`wish:${wishId}`, { ...wish, status: next })
        }
        await tx.exec()
    }
}

const dropComments = async (userId: string, owned: TOwned) => {
    const keys = [...(await scanKeys('wishlist:*:comments')), ...(await scanKeys('wish:*:comments'))]
    for (const key of keys) {
        const parent = key.startsWith('wishlist:') ? owned.wishlists : owned.wishes
        if (parent.has(idOf(key))) continue

        const entries = (await kv.lrange<unknown>(key, 0, -1)) ?? []
        const kept = entries.filter((entry) => parseAuthorId(entry) !== userId)
        if (kept.length === entries.length) continue

        const tx = kv.multi()
        queueListReplace(tx, key, kept.map(toRaw))
        await tx.exec()
    }
}

// Reservations and purchases the user made on other people's wishes.
const releaseWishClaims = async (userId: string, owned: TOwned) => {
    const keys = (await scanKeys('wish:*')).filter((k) => k.split(':').length === 2 && !owned.wishes.has(idOf(k)))

    for (let i = 0; i < keys.length; i += 100) {
        const chunk = keys.slice(i, i + 100)
        const wishes = await kv.mget<(TWishKV | null)[]>(...chunk)
        const tx = kv.multi()
        let queued = 0

        wishes.forEach((wish, idx) => {
            if (!wish || (wish.reservedBy !== userId && wish.purchasedBy !== userId)) return

            const next: TWishKV = { ...wish }
            if (wish.reservedBy === userId) {
                delete next.reservedBy
                if (wish.status === 'reserved') next.status = wish.proposedBy ? 'proposed' : 'wanted'
            }
            // A purchase stays a purchase; only the buyer's identity goes.
            if (wish.purchasedBy === userId) delete next.purchasedBy

            tx.set(chunk[idx], next)
            queued++
        })

        if (queued) await tx.exec()
    }
}

// Removes everything that belongs to a user, plus what they contributed to other
// people's content. Each step is its own transaction and is idempotent, so a
// failed run can simply be retried; the account record is removed last.
export const purgeUser = async (userId: string, email: string) => {
    const wishlistIds = (await kv.smembers<string[]>(`user:${userId}:wishlists`)) ?? []

    const plans = await Promise.all(
        wishlistIds.map(async (wishlistId) => ({
            wishlistId,
            wishIds: (await kv.smembers<string[]>(`wishlist:${wishlistId}:wishes`)) ?? [],
            invitees: (await kv.smembers<string[]>(`wishlist:${wishlistId}:invitees`)) ?? [],
        })),
    )
    const owned: TOwned = {
        wishlists: new Set(wishlistIds),
        wishes: new Set(plans.flatMap((p) => p.wishIds)),
    }

    await dropOrganisedPots(userId, owned)
    await dropPledges(userId, owned)
    await dropComments(userId, owned)
    await releaseWishClaims(userId, owned)

    for (const plan of plans) {
        const tx = kv.multi()
        queueWishlistDeletion(tx, { ...plan, ownerId: userId })
        await tx.exec()
    }

    // Invitations the user received, then the account itself.
    const invitedTo = (await kv.smembers<string[]>(`email:${email}:invitedWishlists`)) ?? []
    const tx = kv.multi()
    for (const wishlistId of invitedTo) tx.srem(`wishlist:${wishlistId}:invitees`, email)
    tx.del(`email:${email}:invitedWishlists`, `user:${userId}:wishlists`, `user:${email}`, `user:id:${userId}`)
    await tx.exec()
}
