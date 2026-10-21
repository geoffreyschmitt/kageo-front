import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-21T10:00:00Z'))
    fake = createFakeKv()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('counters', () => {
    it('incr returns 1, 2, 3 on repeated calls', async () => {
        expect(await fake.incr('rl:a')).toBe(1)
        expect(await fake.incr('rl:a')).toBe(2)
        expect(await fake.incr('rl:a')).toBe(3)
    })

    it('an expired counter restarts at 1 and reports ttl -2 when missing', async () => {
        await fake.incr('rl:a')
        await fake.incr('rl:a')
        expect(await fake.expire('rl:a', 60)).toBe(1)

        vi.setSystemTime(new Date('2026-10-21T10:01:01Z'))

        expect(await fake.ttl('rl:a')).toBe(-2)
        expect(await fake.incr('rl:a')).toBe(1)
        expect(await fake.ttl('rl:a')).toBe(-1)
    })

    it('ttl returns the remaining seconds, rounded up, after expire', async () => {
        await fake.incr('rl:a')
        await fake.expire('rl:a', 60)
        expect(await fake.ttl('rl:a')).toBe(60)

        vi.setSystemTime(new Date('2026-10-21T10:00:20.500Z'))
        expect(await fake.ttl('rl:a')).toBe(40)
    })

    it('ttl is -1 for a counter without expiry and -2 for an unknown key', async () => {
        await fake.incr('rl:a')
        expect(await fake.ttl('rl:a')).toBe(-1)
        expect(await fake.ttl('rl:unknown')).toBe(-2)
    })

    it('expire on a missing counter returns 0', async () => {
        expect(await fake.expire('rl:nope', 60)).toBe(0)
    })

    it('counters do not appear in keys()', async () => {
        await fake.incr('rl:a')
        expect(fake.keys()).toEqual([])
    })

    it('del removes a counter', async () => {
        await fake.incr('rl:a')
        expect(await fake.del('rl:a')).toBe(1)
        expect(await fake.incr('rl:a')).toBe(1)
    })

    it('counter test helper exposes the live value', async () => {
        expect(fake.counter('rl:a')).toBeUndefined()
        await fake.incr('rl:a')
        await fake.incr('rl:a')
        expect(fake.counter('rl:a')).toBe(2)
    })
})
