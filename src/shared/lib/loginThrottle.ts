import { kv } from '@vercel/kv'

import { getRule } from '@/shared/config/rateLimits'

// Counts failed password logins per (email, IP). Successes clear the counter. Fails open.

const keyOf = (email: string, ip: string) => `ratelimit:loginFailures:${email.trim().toLowerCase()}|${ip}`

export const isLoginBlocked = async (email: string, ip: string): Promise<boolean> => {
    const key = keyOf(email, ip)
    try {
        const { limit, windowSeconds } = getRule('loginFailures')
        const count = Number((await kv.get<number>(key)) ?? 0)
        if (count < limit) return false
        // A counter without expiry (EXPIRE never ran) would block forever: repair it.
        if ((await kv.ttl(key)) === -1) await kv.expire(key, windowSeconds)
        return true
    } catch (err) {
        console.warn('rate limit check failed', key, err)
        return false
    }
}

export const recordLoginFailure = async (email: string, ip: string): Promise<void> => {
    const key = keyOf(email, ip)
    try {
        const { windowSeconds } = getRule('loginFailures')
        const count = await kv.incr(key)
        if (count === 1 || (await kv.ttl(key)) === -1) await kv.expire(key, windowSeconds)
    } catch (err) {
        console.warn('rate limit check failed', key, err)
    }
}

export const clearLoginFailures = async (email: string, ip: string): Promise<void> => {
    try {
        await kv.del(keyOf(email, ip))
    } catch {
        // fail open
    }
}
