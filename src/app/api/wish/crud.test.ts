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

import { PUT } from './[wishId]/route'
import { POST as remove } from './delete/route'

const params = (wishId: string) => ({ params: Promise.resolve({ wishId }) })
const status = async () => ((await fake.get('wish:w')) as { status: string }).status

beforeEach(async () => {
    fake = createFakeKv()
    await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', isPublic: true })
    await fake.sadd('wishlist:L:wishes', 'w')
    await fake.set('wish:w', {
        id: 'w', wishlistId: 'L', name: 'Lamp', price: 100, currency: '€', priority: 'medium', status: 'wanted',
    })
})

describe('PUT /api/wish/[wishId]', () => {
    it('is owner-only and validates', async () => {
        signInAs('guest')
        expect((await PUT(jsonRequest({ name: 'x' }, 'PUT'), params('w'))).status).toBe(403)
        signInAs('owner')
        expect((await PUT(jsonRequest({ name: ' ' }, 'PUT'), params('w'))).status).toBe(400)
        expect((await PUT(jsonRequest({ name: 'x'.repeat(201) }, 'PUT'), params('w'))).status).toBe(400)
        expect((await PUT(jsonRequest({ name: 'x', price: -1 }, 'PUT'), params('w'))).status).toBe(400)
        expect((await PUT(jsonRequest({ name: 'x' }, 'PUT'), params('nope'))).status).toBe(404)
    })

    it('updates the fields and keeps the status', async () => {
        signInAs('owner')
        const res = await PUT(jsonRequest({ name: ' Desk lamp ', price: 80, priority: 'high' }, 'PUT'), params('w'))
        expect(res.status).toBe(200)
        expect(await fake.get('wish:w')).toMatchObject({ name: 'Desk lamp', price: 80, priority: 'high', status: 'wanted' })
    })

    it('lowering the price below the pledged total funds the wish; raising it un-funds', async () => {
        await fake.set('wish:w:pot', { creatorId: 'org' })
        await fake.rpush('wish:w:contributions', JSON.stringify({ userId: 'a', amount: 60, contributedAt: 'x' }))
        signInAs('owner')

        await PUT(jsonRequest({ name: 'Lamp', price: 50 }, 'PUT'), params('w'))
        expect(await status()).toBe('funded')

        await PUT(jsonRequest({ name: 'Lamp', price: 200 }, 'PUT'), params('w'))
        expect(await status()).toBe('wanted')
    })
})

describe('POST /api/wish/delete', () => {
    it('is owner-only', async () => {
        signInAs('guest')
        expect((await remove(jsonRequest({ wishId: 'w' }))).status).toBe(403)
        signInAs('owner')
        expect((await remove(jsonRequest({}))).status).toBe(400)
        expect((await remove(jsonRequest({ wishId: 'nope' }))).status).toBe(404)
    })

    it('removes the wish with its pot, pledges and comments, and unlinks it', async () => {
        await fake.set('wish:w:pot', { creatorId: 'org' })
        await fake.rpush('wish:w:contributions', JSON.stringify({ userId: 'a', amount: 5, contributedAt: 'x' }))
        await fake.rpush('wish:w:comments', JSON.stringify({ text: 'hi' }))
        signInAs('owner')

        expect((await remove(jsonRequest({ wishId: 'w' }))).status).toBe(200)
        expect(fake.keys()).toEqual(['wishlist:L'])
        expect(fake.members('wishlist:L:wishes')).toEqual([])
    })
})
