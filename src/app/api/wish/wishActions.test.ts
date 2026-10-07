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

import { POST as cancel } from './cancel/route'
import { POST as markPurchased } from './mark-purchased/route'
import { POST as removePurchased } from './remove-purchased/route'
import { POST as reserve } from './reserve/route'

const wish = async (id: string) => (await fake.get(`wish:${id}`)) as Record<string, unknown>

beforeEach(async () => {
    fake = createFakeKv()
    await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', isPublic: true })
    await fake.set('wishlist:P', { id: 'P', ownerId: 'owner', isPublic: false })
    await fake.set('wish:w', { id: 'w', wishlistId: 'L', status: 'wanted', price: 100 })
    await fake.set('wish:prop', { id: 'prop', wishlistId: 'L', status: 'proposed', proposedBy: 'carol' })
    await fake.set('wish:priv', { id: 'priv', wishlistId: 'P', status: 'wanted' })
})

describe('POST /api/wish/reserve', () => {
    it('requires a session and a wishId', async () => {
        signInAs(null)
        expect((await reserve(jsonRequest({ wishId: 'w' }))).status).toBe(401)
        signInAs('guest')
        expect((await reserve(jsonRequest({}))).status).toBe(400)
        expect((await reserve(jsonRequest({ wishId: 'nope' }))).status).toBe(404)
    })

    it('reserves a wanted wish for the caller', async () => {
        signInAs('guest')
        const res = await reserve(jsonRequest({ wishId: 'w' }))
        expect(res.status).toBe(200)
        expect(await wish('w')).toMatchObject({ status: 'reserved', reservedBy: 'guest' })
    })

    it('refuses a second reservation, a private list, and a wish with a gift pot', async () => {
        signInAs('guest')
        await reserve(jsonRequest({ wishId: 'w' }))
        expect((await reserve(jsonRequest({ wishId: 'w' }))).status).toBe(409)

        expect((await reserve(jsonRequest({ wishId: 'priv' }))).status).toBe(403)

        await fake.set('wish:pot', { id: 'pot', wishlistId: 'L', status: 'wanted' })
        await fake.set('wish:pot:pot', { creatorId: 'carol' })
        const res = await reserve(jsonRequest({ wishId: 'pot' }))
        expect(res.status).toBe(409)
        expect((await bodyOf(res)).message).toMatch(/gift pot/)
    })
})

describe('POST /api/wish/cancel', () => {
    it('only the reserver can cancel, and a proposed wish returns to proposed', async () => {
        signInAs('guest')
        await reserve(jsonRequest({ wishId: 'prop' }))

        signInAs('mallory')
        expect((await cancel(jsonRequest({ wishId: 'prop' }))).status).toBe(403)

        signInAs('guest')
        expect((await cancel(jsonRequest({ wishId: 'prop' }))).status).toBe(200)
        const after = await wish('prop')
        expect(after.status).toBe('proposed')
        expect(after.reservedBy).toBeUndefined()
    })
})

describe('mark / remove purchased', () => {
    it('marks a wish purchased by the caller and refuses doing it twice', async () => {
        signInAs('guest')
        expect((await markPurchased(jsonRequest({ wishId: 'w' }))).status).toBe(200)
        expect(await wish('w')).toMatchObject({ status: 'purchased', purchasedBy: 'guest' })
        expect((await markPurchased(jsonRequest({ wishId: 'w' }))).status).toBe(409)
    })

    it('only the pot organiser may close out a funded wish', async () => {
        await fake.set('wish:w', { id: 'w', wishlistId: 'L', status: 'funded', price: 100 })
        await fake.set('wish:w:pot', { creatorId: 'org' })

        signInAs('guest')
        expect((await markPurchased(jsonRequest({ wishId: 'w' }))).status).toBe(403)
        signInAs('org')
        expect((await markPurchased(jsonRequest({ wishId: 'w' }))).status).toBe(200)
    })

    it('removing the purchase puts a full pot back on funded, not wanted', async () => {
        await fake.set('wish:w', { id: 'w', wishlistId: 'L', status: 'purchased', purchasedBy: 'org', price: 100 })
        await fake.set('wish:w:pot', { creatorId: 'org' })
        await fake.rpush('wish:w:contributions', JSON.stringify({ userId: 'a', amount: 100, contributedAt: 'x' }))

        signInAs('org')
        expect((await removePurchased(jsonRequest({ wishId: 'w' }))).status).toBe(200)
        expect(await wish('w')).toMatchObject({ status: 'funded' })
    })

    it('removing the purchase on a plain wish returns it to wanted', async () => {
        await fake.set('wish:w', { id: 'w', wishlistId: 'L', status: 'purchased', purchasedBy: 'guest' })
        signInAs('guest')
        expect((await removePurchased(jsonRequest({ wishId: 'w' }))).status).toBe(200)
        expect(await wish('w')).toMatchObject({ status: 'wanted' })
    })
})
