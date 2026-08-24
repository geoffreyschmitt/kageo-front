import { kv } from '@vercel/kv'

type KVUser = { name?: string }

// Resolves a user id to a display name via the id -> email -> user KV chain.
export async function getUserNameById(userId: string): Promise<string> {
    const email = await kv.get<string>(`user:id:${userId}`)
    if (!email) return 'Unknown'

    const user = await kv.get<KVUser>(`user:${email}`)
    return user?.name ?? 'Unknown'
}

// Resolves several user ids at once, deduplicating lookups.
export async function getUserNamesByIds(userIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(userIds))
    const names = await Promise.all(uniqueIds.map((id) => getUserNameById(id)))
    return new Map(uniqueIds.map((id, i) => [id, names[i]]))
}
