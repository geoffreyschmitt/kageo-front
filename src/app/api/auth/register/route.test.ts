import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { getRule } from '@/shared/config/rateLimits'

import { POST } from './route'

const register = (ip: string, n: number) =>
    POST(
        new NextRequest('http://localhost/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
            body: JSON.stringify({ email: `u${n}@x.io`, password: 'secret1', name: 'U' }),
        }),
    )

beforeEach(() => {
    fake = createFakeKv()
})

describe('register rate limit', () => {
    it('allows the register limit per IP, then 429 with Retry-After', async () => {
        const { limit } = getRule('register')
        for (let i = 0; i < limit; i++) expect((await register('9.9.9.9', i)).status).toBe(201)
        const res = await register('9.9.9.9', limit)
        expect(res.status).toBe(429)
        expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0)
    }, 60_000)

    it('does not affect another IP', async () => {
        const { limit } = getRule('register')
        for (let i = 0; i < limit + 1; i++) await register('9.9.9.9', i)
        expect((await register('8.8.8.8', 100)).status).toBe(201)
    }, 60_000)
})
