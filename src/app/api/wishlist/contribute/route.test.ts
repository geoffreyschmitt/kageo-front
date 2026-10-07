import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { jsonRequest, signInAs } from '@/test/route'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/shared/config/authOptions', () => ({ authOptions: {} }))

import { PATCH, POST } from './route'

const total = async () => ((await fake.get('wishlist:L')) as { totalContributed?: number }).totalContributed
const pledges = () => fake.list('wishlist:L:contributions').map((c) => [c.userId, c.amount])

beforeEach(async () => {
    fake = createFakeKv()
    await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', isPublic: true })
    await fake.set('wishlist:L:pot', { creatorId: 'org' })
})

describe('guards', () => {
    it('401 without a session, 400 for bad amounts, 404 for an unknown wishlist', async () => {
        signInAs(null)
        expect((await POST(jsonRequest({ wishlistId: 'L', amount: 10 }))).status).toBe(401)
        signInAs('a')
        expect((await POST(jsonRequest({ wishlistId: 'L', amount: 0 }))).status).toBe(400)
        expect((await POST(jsonRequest({ wishlistId: 'nope', amount: 10 }))).status).toBe(404)
    })

    it('answers the owner identically whether or not a pot exists (the pot is a surprise)', async () => {
        signInAs('owner')
        const withPot = (await POST(jsonRequest({ wishlistId: 'L', amount: 10 }))).status
        await fake.del('wishlist:L:pot')
        const withoutPot = (await POST(jsonRequest({ wishlistId: 'L', amount: 10 }))).status
        expect(withPot).toBe(403)
        expect(withoutPot).toBe(withPot)
    })

    it('409 for a guest when no pot exists, 403 on a private list', async () => {
        signInAs('a')
        await fake.del('wishlist:L:pot')
        expect((await POST(jsonRequest({ wishlistId: 'L', amount: 10 }))).status).toBe(409)

        await fake.set('wishlist:L:pot', { creatorId: 'org' })
        await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', isPublic: false })
        expect((await POST(jsonRequest({ wishlistId: 'L', amount: 10 }))).status).toBe(403)
    })
})

describe('pledges and the stored total', () => {
    it('POST adds to the total', async () => {
        signInAs('a')
        await POST(jsonRequest({ wishlistId: 'L', amount: 30 }))
        signInAs('b')
        await POST(jsonRequest({ wishlistId: 'L', amount: 20 }))
        expect(await total()).toBe(50)
    })

    it('PATCH replaces the caller\'s pledge and keeps the total in step', async () => {
        signInAs('a')
        await POST(jsonRequest({ wishlistId: 'L', amount: 30 }))
        signInAs('b')
        await POST(jsonRequest({ wishlistId: 'L', amount: 20 }))

        await PATCH(jsonRequest({ wishlistId: 'L', amount: 5 }, 'PATCH'))
        expect(pledges().sort()).toEqual([['a', 30], ['b', 5]])
        expect(await total()).toBe(35)
    })

    it('PATCH 0 cancels only the caller\'s pledge', async () => {
        signInAs('a')
        await POST(jsonRequest({ wishlistId: 'L', amount: 30 }))
        signInAs('b')
        await POST(jsonRequest({ wishlistId: 'L', amount: 20 }))

        await PATCH(jsonRequest({ wishlistId: 'L', amount: 0 }, 'PATCH'))
        expect(pledges()).toEqual([['a', 30]])
        expect(await total()).toBe(30)
    })
})
