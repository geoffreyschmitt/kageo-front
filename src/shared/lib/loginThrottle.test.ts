import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from './loginThrottle'

const fail = async (n: number, email = 'bob@x.io', ip = '1.1.1.1') => {
    for (let i = 0; i < n; i++) await recordLoginFailure(email, ip)
}

beforeEach(() => {
    fake = createFakeKv()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('loginThrottle', () => {
    it('blocks at 10 failures, not at 9', async () => {
        await fail(9)
        expect(await isLoginBlocked('bob@x.io', '1.1.1.1')).toBe(false)
        await fail(1)
        expect(await isLoginBlocked('bob@x.io', '1.1.1.1')).toBe(true)
    })

    it('normalises the email', async () => {
        await fail(5, ' Bob@X.io ')
        await fail(5, 'bob@x.io')
        expect(await isLoginBlocked('BOB@x.io', '1.1.1.1')).toBe(true)
    })

    it('does not block another IP', async () => {
        await fail(10)
        expect(await isLoginBlocked('bob@x.io', '2.2.2.2')).toBe(false)
    })

    it('clearLoginFailures unblocks', async () => {
        await fail(10)
        await clearLoginFailures('bob@x.io', '1.1.1.1')
        expect(await isLoginBlocked('bob@x.io', '1.1.1.1')).toBe(false)
    })

    it('unblocks after the window', async () => {
        vi.useFakeTimers()
        await fail(10)
        vi.advanceTimersByTime(901_000)
        expect(await isLoginBlocked('bob@x.io', '1.1.1.1')).toBe(false)
    })

    it('fails open when KV throws', async () => {
        fake = { ...fake, get: undefined, incr: async () => { throw new Error('down') } } as never
        await expect(recordLoginFailure('bob@x.io', '1.1.1.1')).resolves.toBeUndefined()
        expect(await isLoginBlocked('bob@x.io', '1.1.1.1')).toBe(false)
    })
})
