import { NextRequest } from 'next/server'

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

import { DELETE, GET as getOne, PUT } from './[id]/route'
import { GET as list, POST as create } from './route'
import { POST as share } from './share/route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const plain = new NextRequest('http://localhost/api/test')
const valid = { name: '  Birthday  ', eventDate: '2026-12-01', isPublic: true, allowSuggestions: true }

describe('create and list', () => {
    beforeEach(() => {
        fake = createFakeKv()
    })

    it('requires a session, a name and an event date', async () => {
        signInAs(null)
        expect((await create(jsonRequest(valid))).status).toBe(401)
        signInAs('owner')
        expect((await create(jsonRequest({ ...valid, name: ' ' }))).status).toBe(400)
        expect((await create(jsonRequest({ ...valid, eventDate: undefined }))).status).toBe(400)
    })

    it('stores the wishlist and indexes it under its owner, trimming the name', async () => {
        signInAs('owner')
        const res = await create(jsonRequest(valid))
        expect(res.status).toBe(201)
        const created = await bodyOf(res)
        expect(created).toMatchObject({ name: 'Birthday', ownerId: 'owner', isPublic: true })
        expect(fake.members('user:owner:wishlists')).toEqual([created.id])
        expect(await fake.get(`wishlist:${created.id}`)).toMatchObject({ name: 'Birthday' })
    })

    it('lists only the caller\'s own wishlists', async () => {
        signInAs('owner')
        await create(jsonRequest(valid))
        signInAs('someone')
        await create(jsonRequest({ ...valid, name: 'Theirs' }))

        signInAs('owner')
        const mine = (await (await list()).json()) as { name: string }[]
        expect(mine.map((w) => w.name)).toEqual(['Birthday'])
    })
})

describe('read, update, delete', () => {
    beforeEach(async () => {
        fake = createFakeKv()
        await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', name: 'N', isPublic: false, allowSuggestions: true })
        await fake.sadd('user:owner:wishlists', 'L')
        await fake.sadd('wishlist:L:wishes', 'w1')
        await fake.set('wish:w1', { id: 'w1', wishlistId: 'L', status: 'wanted' })
        await fake.sadd('wishlist:L:invitees', 'invited@x.io')
        await fake.sadd('email:invited@x.io:invitedWishlists', 'L')
    })

    it('GET hides a private list from strangers but shows it to the owner and invitees', async () => {
        signInAs('stranger')
        expect((await getOne(plain, params('L'))).status).toBe(403)
        signInAs('invited', { email: 'invited@x.io' })
        expect((await getOne(plain, params('L'))).status).toBe(200)
        signInAs('owner')
        const body = await bodyOf(await getOne(plain, params('L')))
        expect((body.wishes as unknown[]).length).toBe(1)
        expect((await getOne(plain, params('nope'))).status).toBe(404)
    })

    it('PUT is owner-only and validates', async () => {
        signInAs('stranger')
        expect((await PUT(jsonRequest(valid, 'PUT'), params('L'))).status).toBe(403)
        signInAs('owner')
        expect((await PUT(jsonRequest({ ...valid, name: '' }, 'PUT'), params('L'))).status).toBe(400)
        const ok = await PUT(jsonRequest({ ...valid, isPublic: false }, 'PUT'), params('L'))
        expect(ok.status).toBe(200)
        expect(await fake.get('wishlist:L')).toMatchObject({ name: 'Birthday', isPublic: false, ownerId: 'owner' })
    })

    it('DELETE is owner-only', async () => {
        signInAs('stranger')
        expect((await DELETE(plain, params('L'))).status).toBe(403)
        signInAs(null)
        expect((await DELETE(plain, params('L'))).status).toBe(401)
    })

    it('DELETE removes the wishlist, its wishes and every back-reference', async () => {
        signInAs('owner')
        expect((await DELETE(plain, params('L'))).status).toBe(200)
        expect(fake.keys()).toEqual([])
    })

    it.each([
        ['a reserved wish', async () => fake.set('wish:w1', { id: 'w1', wishlistId: 'L', status: 'reserved' })],
        ['a wishlist pot', async () => fake.set('wishlist:L:pot', { creatorId: 'a' })],
        ['a gift pot on a wish', async () => fake.set('wish:w1:pot', { creatorId: 'a' })],
        ['a comment', async () => fake.rpush('wishlist:L:comments', JSON.stringify({ text: 'x' }))],
    ])('DELETE is refused once there is activity: %s', async (_label, addActivity) => {
        await addActivity()
        signInAs('owner')
        expect((await DELETE(plain, params('L'))).status).toBe(409)
        expect(fake.has('wishlist:L')).toBe(true)
    })
})

describe('POST /api/wishlist/share', () => {
    beforeEach(async () => {
        fake = createFakeKv()
        await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', isPublic: false })
    })

    it('is owner-only and validates the email', async () => {
        signInAs('stranger')
        expect((await share(jsonRequest({ wishlistId: 'L', email: 'a@b.co' }))).status).toBe(403)
        signInAs('owner')
        expect((await share(jsonRequest({ wishlistId: 'L', email: 'not-an-email' }))).status).toBe(400)
        expect((await share(jsonRequest({ email: 'a@b.co' }))).status).toBe(400)
        expect((await share(jsonRequest({ wishlistId: 'nope', email: 'a@b.co' }))).status).toBe(404)
    })

    it('records the lower-cased invitee on both sides of the index, idempotently', async () => {
        signInAs('owner')
        for (let i = 0; i < 2; i++) {
            expect((await share(jsonRequest({ wishlistId: 'L', email: 'Friend@X.io' }))).status).toBe(200)
        }
        expect(fake.members('wishlist:L:invitees')).toEqual(['friend@x.io'])
        expect(fake.members('email:friend@x.io:invitedWishlists')).toEqual(['L'])
    })
})
