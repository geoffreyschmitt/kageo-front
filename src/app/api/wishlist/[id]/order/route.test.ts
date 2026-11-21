import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { bodyOf, jsonRequest, runAs, signInAs } from '@/test/route'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/shared/config/authOptions', () => ({ authOptions: {} }))

import { PUT } from './route'

const params = { params: Promise.resolve({ id: 'L' }) }
const put = (order: unknown) => PUT(jsonRequest({ order }, 'PUT'), params)
const stored = () => fake.get('wishlist:L:order')

beforeEach(async () => {
    fake = createFakeKv({ latency: true })
    await fake.set('wishlist:L', { id: 'L', ownerId: 'owner' })
    await fake.sadd('wishlist:L:wishes', 'a', 'b', 'c')
})

describe('guards', () => {
    it('401 signed out, 403 for a non-owner (nothing written), 404 for an unknown wishlist', async () => {
        signInAs(null)
        expect((await put(['a'])).status).toBe(401)

        signInAs('guest')
        expect((await put(['a'])).status).toBe(403)
        expect(await stored()).toBeNull()

        signInAs('owner')
        const res = await PUT(jsonRequest({ order: ['a'] }, 'PUT'), { params: Promise.resolve({ id: 'nope' }) })
        expect(res.status).toBe(404)
    })

    it('400 for duplicate ids, or a body that is not a list of strings', async () => {
        signInAs('owner')
        expect((await put(['a', 'a'])).status).toBe(400)
        expect((await put('a')).status).toBe(400)
        expect((await put([1, 2])).status).toBe(400)
        expect(await stored()).toBeNull()
    })
})

describe('saving', () => {
    it('stores the requested order', async () => {
        signInAs('owner')
        const res = await put(['c', 'a', 'b'])
        expect(res.status).toBe(200)
        expect((await bodyOf(res)).order).toEqual(['c', 'a', 'b'])
        expect(await stored()).toEqual(['c', 'a', 'b'])
    })

    it('keeps a wish the request omitted, e.g. one added from another tab', async () => {
        signInAs('owner')
        await put(['b'])
        expect(await stored()).toEqual(['b', 'a', 'c'])
    })

    it('does not fail when the request names a wish that was deleted elsewhere (and never stores it)', async () => {
        signInAs('owner')
        const res = await put(['zzz', 'b'])
        expect(res.status).toBe(200)
        expect(await stored()).toEqual(['b', 'a', 'c'])
    })

    it('prunes ids of wishes that were deleted', async () => {
        signInAs('owner')
        await fake.set('wishlist:L:order', ['gone', 'a'])
        await put(['b'])
        expect(await stored()).toEqual(['b', 'a', 'c'])
    })

    it('two concurrent saves leave one valid permutation', async () => {
        const first = ['a', 'b', 'c']
        const second = ['c', 'b', 'a']
        await Promise.all([runAs('owner', () => put(first)), runAs('owner', () => put(second))])
        const result = (await stored()) as string[]
        expect([first, second]).toContainEqual(result)
    })
})
