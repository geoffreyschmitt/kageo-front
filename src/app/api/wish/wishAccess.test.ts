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

import { POST as contributeToWish } from './contribute/route'
import { POST as markPurchased } from './mark-purchased/route'
import { POST as reserve } from './reserve/route'
import { POST as addWish } from './route'

// Wishlists: PUB (public), PRIV (private, `invited` is invited), NOSUG (public, suggestions off).
beforeEach(async () => {
    fake = createFakeKv()
    await fake.set('wishlist:PUB', { id: 'PUB', ownerId: 'owner', isPublic: true, allowSuggestions: true })
    await fake.set('wishlist:PRIV', { id: 'PRIV', ownerId: 'owner', isPublic: false, allowSuggestions: true })
    await fake.set('wishlist:NOSUG', { id: 'NOSUG', ownerId: 'owner', isPublic: true, allowSuggestions: false })
    await fake.sadd('wishlist:PRIV:invitees', 'invited@x.io')
    await fake.set('wish:priv', { id: 'priv', wishlistId: 'PRIV', status: 'wanted', price: 50 })
})

describe('guests of a private wishlist', () => {
    it('an invited guest can reserve and mark purchased; a stranger cannot', async () => {
        signInAs('stranger')
        expect((await reserve(jsonRequest({ wishId: 'priv' }))).status).toBe(403)
        expect((await markPurchased(jsonRequest({ wishId: 'priv' }))).status).toBe(403)

        signInAs('invited', { email: 'Invited@x.io' })
        expect((await reserve(jsonRequest({ wishId: 'priv' }))).status).toBe(200)
        await fake.set('wish:priv', { id: 'priv', wishlistId: 'PRIV', status: 'wanted' })
        expect((await markPurchased(jsonRequest({ wishId: 'priv' }))).status).toBe(200)
    })

    it('an invited guest can pledge to a gift pot; a stranger cannot', async () => {
        await fake.set('wish:priv:pot', { creatorId: 'org' })

        signInAs('stranger')
        expect((await contributeToWish(jsonRequest({ wishId: 'priv', amount: 10 }))).status).toBe(403)

        signInAs('invited', { email: 'invited@x.io' })
        expect((await contributeToWish(jsonRequest({ wishId: 'priv', amount: 10 }))).status).toBe(200)
    })
})

describe('POST /api/wish (add / propose)', () => {
    const body = (wishlistId: string) => ({ wishlistId, name: 'A thing', price: 10 })

    it('the owner adds a wanted wish', async () => {
        signInAs('owner')
        const res = await addWish(jsonRequest(body('PUB')))
        expect(res.status).toBe(201)
        expect(await bodyOf(res)).toMatchObject({ status: 'wanted' })
    })

    it('a guest on a public list with suggestions on proposes a wish', async () => {
        signInAs('guest')
        const res = await addWish(jsonRequest(body('PUB')))
        expect(res.status).toBe(201)
        expect(await bodyOf(res)).toMatchObject({ status: 'proposed', proposedBy: 'guest' })
    })

    it('refuses suggestions when the owner turned them off', async () => {
        signInAs('guest')
        expect((await addWish(jsonRequest(body('NOSUG')))).status).toBe(403)
        signInAs('owner')
        expect((await addWish(jsonRequest(body('NOSUG')))).status).toBe(201)
    })

    it('refuses a stranger on a private list, accepts an invited guest', async () => {
        signInAs('stranger')
        expect((await addWish(jsonRequest(body('PRIV')))).status).toBe(403)
        signInAs('invited', { email: 'invited@x.io' })
        expect((await addWish(jsonRequest(body('PRIV')))).status).toBe(201)
    })

    it('treats a wishlist with no allowSuggestions flag as open (matches the page default)', async () => {
        await fake.set('wishlist:OLD', { id: 'OLD', ownerId: 'owner', isPublic: true })
        signInAs('guest')
        expect((await addWish(jsonRequest(body('OLD')))).status).toBe(201)
    })
})
