import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

import { getRule } from '@/shared/config/rateLimits'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { clientIp, hit, limitRegister, limitWrite, rateLimitResponse } from './rateLimit'

const req = (ip = '1.2.3.4') => new Request('http://localhost/api/test', { headers: { 'x-forwarded-for': ip } })

beforeEach(() => {
    vi.useFakeTimers()
    fake = createFakeKv()
})

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
})

describe('getRule', () => {
    it('returns the base rule', () => {
        expect(getRule('reserve')).toEqual({ limit: 30, windowSeconds: 600 })
    })

    it('applies RATE_LIMIT_MULTIPLIER at call time', () => {
        vi.stubEnv('RATE_LIMIT_MULTIPLIER', '2')
        expect(getRule('reserve')).toEqual({ limit: 60, windowSeconds: 600 })
    })

    it.each(['abc', '0', '-3'])('falls back to 1 for invalid multiplier %s', (value) => {
        vi.stubEnv('RATE_LIMIT_MULTIPLIER', value)
        expect(getRule('reserve').limit).toBe(30)
    })
})

describe('clientIp', () => {
    it('takes the first forwarded entry', () => {
        expect(clientIp('1.2.3.4, 10.0.0.1')).toBe('1.2.3.4')
    })

    it('falls back to unknown', () => {
        expect(clientIp(null)).toBe('unknown')
        expect(clientIp(undefined)).toBe('unknown')
        expect(clientIp('')).toBe('unknown')
    })
})

describe('hit', () => {
    it('allows exactly limit calls then blocks with a retryAfter', async () => {
        const { limit, windowSeconds } = getRule('register')
        for (let i = 0; i < limit; i++) expect(await hit('register', 'a')).toEqual({ ok: true })
        const blocked = await hit('register', 'a')
        expect(blocked.ok).toBe(false)
        if (!blocked.ok) {
            expect(blocked.retryAfter).toBeGreaterThanOrEqual(1)
            expect(blocked.retryAfter).toBeLessThanOrEqual(windowSeconds)
        }
    })

    it('allows the subject again after the window', async () => {
        const { limit, windowSeconds } = getRule('register')
        for (let i = 0; i < limit + 1; i++) await hit('register', 'a')
        vi.advanceTimersByTime((windowSeconds + 1) * 1000)
        expect(await hit('register', 'a')).toEqual({ ok: true })
    })

    it('fails open when KV errors', async () => {
        fake.incr = vi.fn().mockRejectedValue(new Error('down'))
        expect(await hit('register', 'a')).toEqual({ ok: true })
    })
})

describe('rateLimitResponse', () => {
    it('is a 429 with Retry-After', async () => {
        const res = rateLimitResponse(42)
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(await res.json()).toEqual({ message: 'Too many requests' })
    })
})

describe('limitWrite', () => {
    it('allows then blocks once the account bucket is exhausted, per user', async () => {
        const { limit } = getRule('reserve')
        for (let i = 0; i < limit; i++) expect(await limitWrite(req(), 'u1', 'reserve')).toBeNull()
        const res = await limitWrite(req(), 'u1', 'reserve')
        expect(res?.status).toBe(429)
        expect(await limitWrite(req(), 'u2', 'reserve')).toBeNull()
    })

    it('does not block ten users x 20 reserves from one IP', async () => {
        for (let u = 0; u < 10; u++) {
            for (let i = 0; i < 20; i++) expect(await limitWrite(req(), `user${u}`, 'reserve')).toBeNull()
        }
    })

    it('blocks an IP on its 601st write across users', async () => {
        for (let u = 0; u < 6; u++) {
            for (let i = 0; i < 100; i++) expect(await limitWrite(req(), `user${u}`, 'write')).toBeNull()
        }
        const res = await limitWrite(req(), 'user6', 'write')
        expect(res?.status).toBe(429)
    })
})

describe('limitRegister', () => {
    it('limits by IP', async () => {
        const { limit } = getRule('register')
        for (let i = 0; i < limit; i++) expect(await limitRegister(req())).toBeNull()
        expect((await limitRegister(req()))?.status).toBe(429)
        expect(await limitRegister(req('9.9.9.9'))).toBeNull()
    })
})
