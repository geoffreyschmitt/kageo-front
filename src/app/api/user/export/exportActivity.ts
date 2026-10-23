import { kv } from '@vercel/kv'

import { parseContributions } from '@/app/api/wishlist/pot/readPot'

import { scanKeys } from '@/shared/lib/kvCascade'

type TOwned = { wishlists: Set<string>; wishes: Set<string>; safeBets: Set<string> }
type TTitled = { title?: string; name?: string; status?: string; reservedBy?: string; purchasedBy?: string }

// `wish:{id}:suffix` / `wishlist:{id}:suffix` -> id
const idOf = (key: string): string => key.split(':')[1]

const parseComment = (entry: unknown): { authorId?: string; text?: string; createdAt?: string } | null => {
    try {
        return typeof entry === 'string' ? JSON.parse(entry) : (entry as object)
    } catch {
        return null
    }
}

const titleOf = async (key: string): Promise<string | null> => {
    const record = await kv.get<TTitled>(key)
    return record ? (record.title ?? record.name ?? null) : null
}

// What the user did on other people's content: their own pledges, comments, reservations and
// purchases, mirroring what purgeUser removes. Nothing about other people goes in (no names, no
// other pledgers), and content the user owns is left out: pots and guest comments there are a
// surprise from them.
export const exportActivity = async (userId: string, owned: TOwned) => {
    const pledges: { target: 'wishlist' | 'wish'; id: string; title: string | null; amount: number; contributedAt: string }[] = []
    for (const [pattern, target] of [
        ['wishlist:*:contributions', 'wishlist'],
        ['wish:*:contributions', 'wish'],
    ] as const) {
        for (const key of await scanKeys(pattern)) {
            const id = idOf(key)
            if (owned[target === 'wish' ? 'wishes' : 'wishlists'].has(id)) continue
            const mine = parseContributions((await kv.lrange<string>(key, 0, -1)) ?? []).filter((c) => c.userId === userId)
            if (!mine.length) continue
            const title = await titleOf(`${target}:${id}`)
            for (const c of mine) pledges.push({ target, id, title, amount: c.amount, contributedAt: c.contributedAt })
        }
    }

    const comments: { target: 'wishlist' | 'wish' | 'safebet'; id: string; title: string | null; text: string; createdAt: string }[] = []
    for (const [pattern, target] of [
        ['wishlist:*:comments', 'wishlist'],
        ['wish:*:comments', 'wish'],
        ['safebet:*:comments', 'safebet'],
    ] as const) {
        for (const key of await scanKeys(pattern)) {
            const id = idOf(key)
            if (owned[target === 'wish' ? 'wishes' : target === 'safebet' ? 'safeBets' : 'wishlists'].has(id)) continue
            const mine = ((await kv.lrange<unknown>(key, 0, -1)) ?? []).map(parseComment).filter((c) => c?.authorId === userId)
            if (!mine.length) continue
            const title = target === 'safebet' ? null : await titleOf(`${target}:${id}`)
            for (const c of mine) comments.push({ target, id, title, text: c?.text ?? '', createdAt: c?.createdAt ?? '' })
        }
    }

    const claims: { wishId: string; title: string | null; reserved: boolean; purchased: boolean }[] = []
    const wishKeys = (await scanKeys('wish:*')).filter((k) => k.split(':').length === 2 && !owned.wishes.has(idOf(k)))
    for (let i = 0; i < wishKeys.length; i += 100) {
        const chunk = wishKeys.slice(i, i + 100)
        const wishes = await kv.mget<(TTitled | null)[]>(...chunk)
        for (const [idx, wish] of wishes.entries()) {
            if (!wish || (wish.reservedBy !== userId && wish.purchasedBy !== userId)) continue
            claims.push({
                wishId: idOf(chunk[idx]),
                title: wish.title ?? null,
                reserved: wish.reservedBy === userId,
                purchased: wish.purchasedBy === userId,
            })
        }
    }

    return { pledges, comments, claims }
}
