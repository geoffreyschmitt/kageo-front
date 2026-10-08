import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { LockTimeoutError, withLock } from './kvLock'

beforeEach(() => {
    fake = createFakeKv()
})

describe('withLock', () => {
    it('runs sections one at a time and releases the lock', async () => {
        let running = 0
        let maxRunning = 0
        const section = () =>
            withLock('k', async () => {
                running++
                maxRunning = Math.max(maxRunning, running)
                await new Promise((r) => setTimeout(r, 5))
                running--
            })

        await Promise.all([section(), section(), section()])
        expect(maxRunning).toBe(1)
        expect(fake.has('lock:k')).toBe(false)
    })

    it('releases the lock when the section throws', async () => {
        await expect(withLock('k', async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
        expect(fake.has('lock:k')).toBe(false)
    })

    it('times out with LockTimeoutError when the lock stays held', async () => {
        await fake.set('lock:k', 'someone-else')
        await expect(withLock('k', async () => 1, { waitMs: 30, retryMs: 5 })).rejects.toBeInstanceOf(LockTimeoutError)
        expect(await fake.get('lock:k')).toBe('someone-else')
    })

    it("does not release a lock that someone else took after ours expired", async () => {
        await withLock('k', async () => {
            await fake.set('lock:k', 'new-owner')
        })
        expect(await fake.get('lock:k')).toBe('new-owner')
    })
})
