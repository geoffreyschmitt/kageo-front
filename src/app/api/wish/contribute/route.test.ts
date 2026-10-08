import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { bodyOf, jsonRequest, signInAs } from '@/test/route'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/shared/config/authOptions', () => ({ authOptions: {} }))

import { PATCH, POST } from './route'

const status = async () => ((await fake.get('wish:w')) as { status: string }).status
const pledges = () => fake.list('wish:w:contributions').map((c) => [c.userId, c.amount])

beforeEach(async () => {
    fake = createFakeKv({ latency: true })
    await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', isPublic: true })
    await fake.set('wish:w', { id: 'w', wishlistId: 'L', status: 'wanted', price: 100 })
    await fake.set('wish:w:pot', { creatorId: 'org' })
})

describe('concurrency', () => {
    it('simultaneous pledges that together reach the price all land and flip the wish to funded once', async () => {
        const users = ['a', 'b', 'c', 'd']
        const responses = await Promise.all(
            users.map((u) => {
                signInAs(u) // the session is read synchronously when each handler starts
                return POST(jsonRequest({ wishId: 'w', amount: 25 }))
            }),
        )
        expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200])
        expect(pledges()).toHaveLength(4)
        expect(await status()).toBe('funded')
        expect(fake.has('lock:wish:w')).toBe(false)
    })

    it('concurrent replacements by different people never drop one another', async () => {
        const users = ['a', 'b', 'c']
        await Promise.all(
            users.map((u, i) => {
                signInAs(u)
                return PATCH(jsonRequest({ wishId: 'w', amount: 10 * (i + 1) }, 'PATCH'))
            }),
        )
        expect(pledges().sort()).toEqual([['a', 10], ['b', 20], ['c', 30]])
    })
})

describe('guards', () => {
    it('401 without a session, 400 for bad amounts', async () => {
        signInAs(null)
        expect((await POST(jsonRequest({ wishId: 'w', amount: 10 }))).status).toBe(401)

        signInAs('a')
        for (const amount of [0, -5, 'abc']) {
            expect((await POST(jsonRequest({ wishId: 'w', amount }))).status).toBe(400)
        }
        expect((await PATCH(jsonRequest({ wishId: 'w', amount: -1 }, 'PATCH'))).status).toBe(400)
    })

    it('refuses the owner with 403 even when there is no pot (no existence leak)', async () => {
        await fake.del('wish:w:pot')
        signInAs('owner')
        expect((await POST(jsonRequest({ wishId: 'w', amount: 10 }))).status).toBe(403)
    })

    it('409 when no pot has been started, 403 on a private list', async () => {
        signInAs('a')
        await fake.del('wish:w:pot')
        expect((await POST(jsonRequest({ wishId: 'w', amount: 10 }))).status).toBe(409)

        await fake.set('wish:w:pot', { creatorId: 'org' })
        await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', isPublic: false })
        expect((await POST(jsonRequest({ wishId: 'w', amount: 10 }))).status).toBe(403)
    })
})

describe('funding', () => {
    it('flips wanted -> funded when pledges reach the price', async () => {
        signInAs('a')
        const first = await bodyOf(await POST(jsonRequest({ wishId: 'w', amount: 60 })))
        expect(first).toMatchObject({ totalContributed: 60, isFunded: false })
        expect(await status()).toBe('wanted')

        signInAs('b')
        const second = await bodyOf(await POST(jsonRequest({ wishId: 'w', amount: 40 })))
        expect(second).toMatchObject({ totalContributed: 100, isFunded: true })
        expect(await status()).toBe('funded')
    })

    it('PATCH replaces the caller\'s pledge and un-funds when it drops below the goal', async () => {
        signInAs('a')
        await POST(jsonRequest({ wishId: 'w', amount: 60 }))
        signInAs('b')
        await POST(jsonRequest({ wishId: 'w', amount: 40 }))
        expect(await status()).toBe('funded')

        signInAs('b')
        const res = await bodyOf(await PATCH(jsonRequest({ wishId: 'w', amount: 10 }, 'PATCH')))
        expect(res).toMatchObject({ totalContributed: 70, myContribution: 10, isFunded: false })
        expect(pledges().sort()).toEqual([['a', 60], ['b', 10]])
        expect(await status()).toBe('wanted')
    })

    it('PATCH with amount 0 cancels only the caller\'s pledge', async () => {
        signInAs('a')
        await POST(jsonRequest({ wishId: 'w', amount: 30 }))
        signInAs('b')
        await POST(jsonRequest({ wishId: 'w', amount: 20 }))

        await PATCH(jsonRequest({ wishId: 'w', amount: 0 }, 'PATCH'))
        expect(pledges()).toEqual([['a', 30]])
    })

    it('never moves reserved or purchased wishes to funded', async () => {
        await fake.set('wish:w', { id: 'w', wishlistId: 'L', status: 'reserved', price: 100 })
        signInAs('a')
        await POST(jsonRequest({ wishId: 'w', amount: 500 }))
        expect(await status()).toBe('reserved')
    })
})
