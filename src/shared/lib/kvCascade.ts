import { kv } from '@vercel/kv'

// A MULTI/EXEC transaction: every queued command is applied together or not at all.
export type KvTx = ReturnType<typeof kv.multi>

// Every key that hangs off a wish. Keep in sync with docs/architecture.md.
export const wishKeys = (wishId: string): string[] => [
    `wish:${wishId}`,
    `wish:${wishId}:pot`,
    `wish:${wishId}:contributions`,
    `wish:${wishId}:comments`,
]

// Every key that hangs off a wishlist, excluding its wishes' own keys.
export const wishlistKeys = (wishlistId: string): string[] => [
    `wishlist:${wishlistId}`,
    `wishlist:${wishlistId}:wishes`,
    `wishlist:${wishlistId}:invitees`,
    `wishlist:${wishlistId}:pot`,
    `wishlist:${wishlistId}:contributions`,
    `wishlist:${wishlistId}:comments`,
]

export const queueWishDeletion = (tx: KvTx, wishId: string) => {
    tx.del(...wishKeys(wishId))
}

// Queues the deletion of a wishlist, all its wishes, and the back-references that
// point at it (invitees' reverse index, the owner's wishlist set).
export const queueWishlistDeletion = (
    tx: KvTx,
    params: { wishlistId: string; ownerId: string; wishIds: string[]; invitees: string[] },
) => {
    const { wishlistId, ownerId, wishIds, invitees } = params
    for (const wishId of wishIds) queueWishDeletion(tx, wishId)
    for (const email of invitees) tx.srem(`email:${email}:invitedWishlists`, wishlistId)
    tx.srem(`user:${ownerId}:wishlists`, wishlistId)
    tx.del(...wishlistKeys(wishlistId))
}

// Replaces a whole list in one step so a failure never leaves it emptied.
export const queueListReplace = (tx: KvTx, key: string, items: string[]) => {
    tx.del(key)
    if (items.length) tx.rpush(key, ...items)
}

// SCAN is cursor-based and may return a key twice; callers get a de-duplicated list.
export const scanKeys = async (match: string): Promise<string[]> => {
    const found = new Set<string>()
    let cursor: string | number = 0
    do {
        const [next, batch]: [string | number, string[]] = await kv.scan(cursor, { match, count: 500 })
        for (const key of batch) found.add(key)
        cursor = next
    } while (String(cursor) !== '0')
    return Array.from(found)
}
