import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { purgeUser } from './purgeUser'

const contribution = (userId: string, amount: number) => JSON.stringify({ userId, amount, contributedAt: '2026-01-01' })
const comment = (authorId: string, text: string) => JSON.stringify({ id: text, authorId, authorName: authorId, text })

// Alice (leaving) owns wishlist A. Bob owns wishlist B, which Alice is invited to.
const seed = async () => {
    await fake.set('user:alice@x.io', { id: 'alice', email: 'alice@x.io' })
    await fake.set('user:id:alice', 'alice@x.io')
    await fake.set('user:bob@x.io', { id: 'bob', email: 'bob@x.io' })
    await fake.set('user:id:bob', 'bob@x.io')

    // Alice's wishlist A, with a wish carrying a pot, pledges and a comment.
    await fake.sadd('user:alice:wishlists', 'A')
    await fake.set('wishlist:A', { id: 'A', ownerId: 'alice' })
    await fake.sadd('wishlist:A:wishes', 'wA')
    await fake.sadd('wishlist:A:invitees', 'bob@x.io')
    await fake.sadd('email:bob@x.io:invitedWishlists', 'A')
    await fake.set('wish:wA', { id: 'wA', wishlistId: 'A', status: 'funded', price: 100 })
    await fake.set('wish:wA:pot', { creatorId: 'bob' })
    await fake.rpush('wish:wA:contributions', contribution('bob', 100))
    await fake.rpush('wish:wA:comments', comment('bob', 'hi'))
    await fake.rpush('wishlist:A:comments', comment('bob', 'hello'))

    // Bob's wishlist B, where Alice is a guest.
    await fake.sadd('user:bob:wishlists', 'B')
    await fake.set('wishlist:B', { id: 'B', ownerId: 'bob', totalContributed: 80 })
    await fake.sadd('wishlist:B:wishes', 'w1', 'w2', 'w3')
    await fake.sadd('wishlist:B:invitees', 'alice@x.io')
    await fake.sadd('email:alice@x.io:invitedWishlists', 'B')
    await fake.set('wishlist:B:pot', { creatorId: 'carol' })
    await fake.rpush('wishlist:B:contributions', contribution('alice', 30), contribution('carol', 50))
    await fake.rpush('wishlist:B:comments', comment('alice', 'mine'), comment('carol', 'theirs'))

    // w1: Alice reserved. w2: Alice purchased. w3: gift pot Alice organises, pledged by Dave.
    await fake.set('wish:w1', { id: 'w1', wishlistId: 'B', status: 'reserved', reservedBy: 'alice', proposedBy: 'carol' })
    await fake.set('wish:w2', { id: 'w2', wishlistId: 'B', status: 'purchased', purchasedBy: 'alice' })
    await fake.set('wish:w3', { id: 'w3', wishlistId: 'B', status: 'funded', price: 40 })
    await fake.set('wish:w3:pot', { creatorId: 'alice' })
    await fake.rpush('wish:w3:contributions', contribution('dave', 40))
}

beforeEach(async () => {
    fake = createFakeKv()
    await seed()
})

describe('purgeUser', () => {
    it('removes the account records and everything the user owns', async () => {
        await purgeUser('alice', 'alice@x.io')

        for (const key of [
            'user:alice@x.io',
            'user:id:alice',
            'user:alice:wishlists',
            'wishlist:A',
            'wishlist:A:wishes',
            'wishlist:A:invitees',
            'wishlist:A:comments',
            'wish:wA',
            'wish:wA:pot',
            'wish:wA:contributions',
            'wish:wA:comments',
            'email:alice@x.io:invitedWishlists',
        ]) {
            expect(fake.has(key), key).toBe(false)
        }
    })

    it('cleans the reverse invite index other users hold for the deleted wishlist', async () => {
        await purgeUser('alice', 'alice@x.io')
        expect(fake.has('email:bob@x.io:invitedWishlists')).toBe(false)
    })

    it('leaves other users and their data intact', async () => {
        await purgeUser('alice', 'alice@x.io')
        expect(fake.has('user:bob@x.io')).toBe(true)
        expect(fake.has('wishlist:B')).toBe(true)
        expect(fake.members('wishlist:B:invitees')).toEqual([])
    })

    it('removes the pledge the user made elsewhere and fixes the wishlist total', async () => {
        await purgeUser('alice', 'alice@x.io')
        expect(fake.list('wishlist:B:contributions').map((c) => c.userId)).toEqual(['carol'])
        expect(((await fake.get('wishlist:B')) as { totalContributed: number }).totalContributed).toBe(50)
    })

    it('removes only the user\'s comments on other people\'s content', async () => {
        await purgeUser('alice', 'alice@x.io')
        expect(fake.list('wishlist:B:comments').map((c) => c.authorId)).toEqual(['carol'])
    })

    it('releases reservations (restoring the pre-reservation status) and purchases', async () => {
        await purgeUser('alice', 'alice@x.io')
        const w1 = (await fake.get('wish:w1')) as Record<string, unknown>
        expect(w1.status).toBe('proposed')
        expect(w1.reservedBy).toBeUndefined()

        const w2 = (await fake.get('wish:w2')) as Record<string, unknown>
        expect(w2.status).toBe('purchased')
        expect(w2.purchasedBy).toBeUndefined()
    })

    it('drops a pot the user organised and un-funds the wish', async () => {
        await purgeUser('alice', 'alice@x.io')
        expect(fake.has('wish:w3:pot')).toBe(false)
        expect(fake.has('wish:w3:contributions')).toBe(false)
        expect(((await fake.get('wish:w3')) as { status: string }).status).toBe('wanted')
    })

    it('is safe to run twice (a failed run can be retried)', async () => {
        await purgeUser('alice', 'alice@x.io')
        const after = fake.keys()
        await purgeUser('alice', 'alice@x.io')
        expect(fake.keys()).toEqual(after)
    })
})
