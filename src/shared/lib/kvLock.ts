import { NextResponse } from 'next/server'

import { kv } from '@vercel/kv'

// A short mutex over a KV key, for read-modify-write sections.
// @vercel/kv speaks Upstash's stateless REST API, so WATCH/MULTI optimistic locking is not
// available; SET NX EX is. The TTL bounds the damage if a function dies while holding it.

export class LockTimeoutError extends Error {
    constructor(key: string) {
        super(`Could not acquire lock ${key}`)
        this.name = 'LockTimeoutError'
    }
}

type TLockOptions = { ttlSeconds?: number; waitMs?: number; retryMs?: number }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const withLock = async <T>(
    key: string,
    fn: () => Promise<T>,
    { ttlSeconds = 10, waitMs = 3000, retryMs = 40 }: TLockOptions = {},
): Promise<T> => {
    const lockKey = `lock:${key}`
    const token = crypto.randomUUID()
    const deadline = Date.now() + waitMs

    while ((await kv.set(lockKey, token, { nx: true, ex: ttlSeconds })) === null) {
        if (Date.now() >= deadline) throw new LockTimeoutError(key)
        await sleep(retryMs + Math.random() * retryMs)
    }

    try {
        return await fn()
    } finally {
        // Only release our own lock: if it expired and someone else took it, leave it.
        if ((await kv.get<string>(lockKey)) === token) await kv.del(lockKey)
    }
}

// One lock per record, shared by every route that read-modify-writes it, so a reservation, an
// edit and a pledge on the same wish queue up instead of overwriting each other.
export const wishLock = (wishId: string) => `wish:${wishId}`
export const wishlistLock = (wishlistId: string) => `wishlist:${wishlistId}`

export const busyResponse = () => NextResponse.json({ message: 'Resource is busy, try again' }, { status: 503 })
