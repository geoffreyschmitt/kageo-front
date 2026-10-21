import { NextResponse } from 'next/server'

import { kv } from '@vercel/kv'

import { getRule, type TRateLimitName, type TWriteLimit } from '@/shared/config/rateLimits'

// Fixed-window counters over KV (INCR + EXPIRE on the first hit). Fails open: if KV is
// unreachable, the request goes through rather than locking everyone out.

export type THitResult = { ok: true } | { ok: false; retryAfter: number }

export const clientIp = (forwardedFor: string | null | undefined): string =>
    forwardedFor?.split(',')[0]?.trim() || 'unknown'

export const hit = async (name: TRateLimitName, subject: string): Promise<THitResult> => {
    const { limit, windowSeconds } = getRule(name)
    const key = `ratelimit:${name === 'ipCeiling' ? 'ip' : name}:${subject}`
    try {
        const count = await kv.incr(key)
        if (count === 1) await kv.expire(key, windowSeconds)
        if (count <= limit) return { ok: true }
        const ttl = await kv.ttl(key)
        // A counter without expiry (INCR succeeded, EXPIRE never ran) would block forever: repair it.
        if (ttl === -1) await kv.expire(key, windowSeconds)
        return { ok: false, retryAfter: ttl < 0 ? windowSeconds : Math.max(1, ttl) }
    } catch (err) {
        console.warn('rate limit check failed', key, err)
        return { ok: true }
    }
}

export const rateLimitResponse = (retryAfter: number) =>
    NextResponse.json(
        { message: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )

const ipOf = (request: Request) => clientIp(request.headers.get('x-forwarded-for'))

// Per-account bucket for the action, then a generous per-IP ceiling across all accounts.
export const limitWrite = async (request: Request, userId: string, name: TWriteLimit) => {
    const account = await hit(name, userId)
    if (!account.ok) return rateLimitResponse(account.retryAfter)
    const ip = await hit('ipCeiling', ipOf(request))
    if (!ip.ok) return rateLimitResponse(ip.retryAfter)
    return null
}

export const limitRegister = async (request: Request) => {
    const result = await hit('register', ipOf(request))
    return result.ok ? null : rateLimitResponse(result.retryAfter)
}
