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
    await fake.set('user:carol@x.io', { id: 'carol', email: 'carol@x.io', name: 'Carol' })
    await fake.set('user:id:carol', 'carol@x.io')
    await fake.set('user:dave@x.io', { id: 'dave', email: 'dave@x.io', name: 'Dave' })
    await fake.set('user:id:dave', 'dave@x.io')

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

    // w4: a pot Alice organises that nobody else pledged to.
    await fake.sadd('wishlist:B:wishes', 'w4')
    await fake.set('wish:w4', { id: 'w4', wishlistId: 'B', status: 'wanted', price: 40 })
    await fake.set('wish:w4:pot', { creatorId: 'alice', creatorName: 'Alice' })
    await fake.rpush('wish:w4:contributions', contribution('alice', 40))
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

    it('hands a gift pot to its biggest remaining pledger and keeps the pledges and funded status', async () => {
        await purgeUser('alice', 'alice@x.io')
        expect(await fake.get('wish:w3:pot')).toMatchObject({ creatorId: 'dave', creatorName: 'Dave' })
        expect(fake.list('wish:w3:contributions').map((c) => c.userId)).toEqual(['dave'])
        expect(((await fake.get('wish:w3')) as { status: string }).status).toBe('funded')
    })

    it('hands a wishlist pot over, removes the leaving user’s own pledge and fixes the total', async () => {
        await fake.set('wishlist:C', { id: 'C', ownerId: 'bob', totalContributed: 80 })
        await fake.set('wishlist:C:pot', { creatorId: 'alice', creatorName: 'Alice' })
        await fake.rpush(
            'wishlist:C:contributions',
            contribution('alice', 10),
            contribution('carol', 20),
            contribution('dave', 50),
        )
        await purgeUser('alice', 'alice@x.io')

        expect(await fake.get('wishlist:C:pot')).toMatchObject({ creatorId: 'dave', creatorName: 'Dave' })
        expect(fake.list('wishlist:C:contributions').map((c) => c.userId).sort()).toEqual(['carol', 'dave'])
        expect(((await fake.get('wishlist:C')) as { totalContributed: number }).totalContributed).toBe(70)
    })

    it('breaks a tie in favour of the earliest pledge', async () => {
        await fake.set('wishlist:C', { id: 'C', ownerId: 'bob', totalContributed: 60 })
        await fake.set('wishlist:C:pot', { creatorId: 'alice' })
        await fake.rpush(
            'wishlist:C:contributions',
            JSON.stringify({ userId: 'dave', amount: 30, contributedAt: '2026-02-01' }),
            JSON.stringify({ userId: 'carol', amount: 30, contributedAt: '2026-01-01' }),
        )
        await purgeUser('alice', 'alice@x.io')
        expect(await fake.get('wishlist:C:pot')).toMatchObject({ creatorId: 'carol' })
    })

    it('skips a pledger whose account is gone and falls through to the next', async () => {
        await fake.set('wishlist:C', { id: 'C', ownerId: 'bob', totalContributed: 90 })
        await fake.set('wishlist:C:pot', { creatorId: 'alice' })
        await fake.rpush('wishlist:C:contributions', contribution('ghost', 70), contribution('carol', 20))
        await purgeUser('alice', 'alice@x.io')
        expect(await fake.get('wishlist:C:pot')).toMatchObject({ creatorId: 'carol', creatorName: 'Carol' })
    })

    it('never hands a pot to the wishlist owner', async () => {
        await fake.set('wishlist:C', { id: 'C', ownerId: 'bob', totalContributed: 90 })
        await fake.set('wishlist:C:pot', { creatorId: 'alice' })
        await fake.rpush('wishlist:C:contributions', contribution('bob', 70), contribution('carol', 20))
        await purgeUser('alice', 'alice@x.io')
        expect(await fake.get('wishlist:C:pot')).toMatchObject({ creatorId: 'carol' })
    })

    it('drops a pot nobody else pledged to, and un-funds the wish', async () => {
        await fake.set('wish:w4', { id: 'w4', wishlistId: 'B', status: 'funded', price: 40 })
        await purgeUser('alice', 'alice@x.io')
        expect(fake.has('wish:w4:pot')).toBe(false)
        expect(fake.has('wish:w4:contributions')).toBe(false)
        expect(((await fake.get('wish:w4')) as { status: string }).status).toBe('wanted')
    })

    it('leaves a handed-over pot alone on a retry', async () => {
        await purgeUser('alice', 'alice@x.io')
        await purgeUser('alice', 'alice@x.io')
        expect(await fake.get('wish:w3:pot')).toMatchObject({ creatorId: 'dave' })
    })

    it('is safe to run twice (a failed run can be retried)', async () => {
        await purgeUser('alice', 'alice@x.io')
        const after = fake.keys()
        await purgeUser('alice', 'alice@x.io')
        expect(fake.keys()).toEqual(after)
    })
})
