import { kv } from '@vercel/kv'

import { reconcileFundedStatus } from '@/app/api/wish/pot/reconcileFundedStatus'
import { parseContributions } from '@/app/api/wishlist/pot/readPot'

import { queueListReplace, queueWishlistDeletion, scanKeys } from '@/shared/lib/kvCascade'
import { withLock, wishLock, wishlistLock } from '@/shared/lib/kvLock'

type TWishKV = {
    id: string
    wishlistId?: string
    status: string
    price?: number
    reservedBy?: string
    purchasedBy?: string
    proposedBy?: string
}
type TWishlistKV = { id: string; ownerId?: string; totalContributed?: number }
type TPotKV = { creatorId: string; creatorName?: string }
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

type TPledge = { userId: string; amount: number; contributedAt: string }

// Who should inherit a pot: the biggest remaining pledger, the earliest pledge winning a tie.
// Pledges are summed per person and non-positive totals do not count. The wishlist owner is
// never eligible (pots are a surprise to them). Returns candidates best-first.
const rankSuccessors = (pledges: TPledge[], leavingId: string, wishlistOwnerId?: string): string[] => {
    const byUser = new Map<string, { total: number; first: string }>()
    for (const c of pledges) {
        if (c.userId === leavingId || c.userId === wishlistOwnerId) continue
        const entry = byUser.get(c.userId) ?? { total: 0, first: c.contributedAt }
        entry.total += c.amount
        if (c.contributedAt < entry.first) entry.first = c.contributedAt
        byUser.set(c.userId, entry)
    }
    return Array.from(byUser.entries())
        .filter(([, e]) => e.total > 0)
        .sort(([, a], [, b]) => b.total - a.total || (a.first < b.first ? -1 : a.first > b.first ? 1 : 0))
        .map(([id]) => id)
}

// The first candidate that still has an account, with the name to show as organiser.
const resolveSuccessor = async (candidates: string[]): Promise<{ id: string; name: string } | null> => {
    for (const id of candidates) {
        const email = await kv.get<string>(`user:id:${id}`)
        const user = email ? await kv.get<{ name?: string }>(`user:${email}`) : null
        if (user) return { id, name: user.name ?? '' }
    }
    return null
}

// Pots the user organises on other people's content. The pot moves to its biggest remaining
// pledger so the others keep their pledges; with nobody to inherit it, it is dropped (pledges
// are only intentions, no money moves through Kageo). The leaving user's own pledge is removed
// afterwards by dropPledges. Note the new organiser can see every pledger's name and amount.
const handOverOrDropOrganisedPots = async (userId: string, owned: TOwned) => {
    for (const key of await scanKeys('wishlist:*:pot')) {
        const wishlistId = idOf(key)
        if (owned.wishlists.has(wishlistId)) continue

        await withLock(wishlistLock(wishlistId), async () => {
            const pot = await kv.get<TPotKV>(key)
            if (pot?.creatorId !== userId) return

            const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
            const pledges = parseContributions((await kv.lrange<string>(`wishlist:${wishlistId}:contributions`, 0, -1)) ?? [])
            const successor = await resolveSuccessor(rankSuccessors(pledges, userId, wishlist?.ownerId))
            if (successor) {
                await kv.set(key, { ...pot, creatorId: successor.id, creatorName: successor.name })
                return
            }

            const tx = kv.multi()
            tx.del(key, `wishlist:${wishlistId}:contributions`)
            if (wishlist) tx.set(`wishlist:${wishlistId}`, { ...wishlist, totalContributed: 0 })
            await tx.exec()
        })
    }

    for (const key of await scanKeys('wish:*:pot')) {
        const wishId = idOf(key)
        if (owned.wishes.has(wishId)) continue

        await withLock(wishLock(wishId), async () => {
            const pot = await kv.get<TPotKV>(key)
            if (pot?.creatorId !== userId) return

            const wish = await kv.get<TWishKV>(`wish:${wishId}`)
            const wishlist = wish?.wishlistId ? await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`) : null
            const pledges = parseContributions((await kv.lrange<string>(`wish:${wishId}:contributions`, 0, -1)) ?? [])
            const successor = await resolveSuccessor(rankSuccessors(pledges, userId, wishlist?.ownerId))
            if (successor) {
                await kv.set(key, { ...pot, creatorId: successor.id, creatorName: successor.name })
                return
            }

            const tx = kv.multi()
            tx.del(key, `wish:${wishId}:contributions`)
            if (wish?.status === 'funded') tx.set(`wish:${wishId}`, { ...wish, status: 'wanted' })
            await tx.exec()
        })
    }
}

// Pledges the user made to pots they don't organise.
const dropPledges = async (userId: string, owned: TOwned) => {
    for (const key of await scanKeys('wishlist:*:contributions')) {
        const wishlistId = idOf(key)
        if (owned.wishlists.has(wishlistId)) continue

        await withLock(wishlistLock(wishlistId), async () => {
            const all = parseContributions((await kv.lrange<string>(key, 0, -1)) ?? [])
            const mine = all.filter((c) => c.userId === userId)
            if (!mine.length) return

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
        })
    }

    for (const key of await scanKeys('wish:*:contributions')) {
        const wishId = idOf(key)
        if (owned.wishes.has(wishId)) continue

        await withLock(wishLock(wishId), async () => {
            const all = parseContributions((await kv.lrange<string>(key, 0, -1)) ?? [])
            if (!all.some((c) => c.userId === userId)) return

            const rest = all.filter((c) => c.userId !== userId)
            const wish = await kv.get<TWishKV>(`wish:${wishId}`)
            const tx = kv.multi()
            queueListReplace(tx, key, rest.map((c) => JSON.stringify(c)))
            if (wish) {
                const next = reconcileFundedStatus(wish.status, totalOf(rest), wish.price ?? 0)
                if (next) tx.set(`wish:${wishId}`, { ...wish, status: next })
            }
            await tx.exec()
        })
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

        // The bulk read only finds candidates; each is re-read under its lock before it is rewritten.
        for (const [idx, candidate] of wishes.entries()) {
            if (!candidate || (candidate.reservedBy !== userId && candidate.purchasedBy !== userId)) continue

            await withLock(wishLock(idOf(chunk[idx])), async () => {
                const wish = await kv.get<TWishKV>(chunk[idx])
                if (!wish || (wish.reservedBy !== userId && wish.purchasedBy !== userId)) return

                const next: TWishKV = { ...wish }
                if (wish.reservedBy === userId) {
                    delete next.reservedBy
                    if (wish.status === 'reserved') next.status = wish.proposedBy ? 'proposed' : 'wanted'
                }
                // A purchase stays a purchase; only the buyer's identity goes.
                if (wish.purchasedBy === userId) delete next.purchasedBy

                await kv.set(chunk[idx], next)
            })
        }
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

    await handOverOrDropOrganisedPots(userId, owned)
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
