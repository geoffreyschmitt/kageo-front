import { kv } from '@vercel/kv'

import { getRule } from '@/shared/config/rateLimits'

// Counts failed password logins per (email, IP). Successes clear the counter. Fails open.

const keyOf = (email: string, ip: string) => `ratelimit:loginFailures:${email.trim().toLowerCase()}|${ip}`

export const isLoginBlocked = async (email: string, ip: string): Promise<boolean> => {
    try {
        const count = Number((await kv.get<number>(keyOf(email, ip))) ?? 0)
        return count >= getRule('loginFailures').limit
    } catch {
        return false
    }
}

export const recordLoginFailure = async (email: string, ip: string): Promise<void> => {
    try {
        const key = keyOf(email, ip)
        const count = await kv.incr(key)
        if (count === 1) await kv.expire(key, getRule('loginFailures').windowSeconds)
    } catch {
        // fail open
    }
}

export const clearLoginFailures = async (email: string, ip: string): Promise<void> => {
    try {
        await kv.del(keyOf(email, ip))
    } catch {
        // fail open
    }
}
