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

import { GET as getWishComments, POST as postWishComment } from './wish/[wishId]/comments/route'
import { GET as getListComments, POST as postListComment } from './wishlist/[id]/comments/route'

const get = new NextRequest('http://localhost/api/test')
const listParams = (id: string) => ({ params: Promise.resolve({ id }) })
const wishParams = (wishId: string) => ({ params: Promise.resolve({ wishId }) })

beforeEach(async () => {
    fake = createFakeKv()
    await fake.set('wishlist:PUB', { id: 'PUB', ownerId: 'owner', isPublic: true })
    await fake.set('wishlist:PRIV', { id: 'PRIV', ownerId: 'owner', isPublic: false })
    await fake.sadd('wishlist:PRIV:invitees', 'invited@x.io')
    await fake.set('wish:pub', { id: 'pub', wishlistId: 'PUB' })
    await fake.set('wish:priv', { id: 'priv', wishlistId: 'PRIV' })
})

describe.each([
    {
        name: 'wishlist comments',
        id: 'PUB',
        privId: 'PRIV',
        read: (id: string) => getListComments(get, listParams(id)),
        write: (id: string, body: unknown) => postListComment(jsonRequest(body), listParams(id)),
    },
    {
        name: 'wish comments',
        id: 'pub',
        privId: 'priv',
        read: (id: string) => getWishComments(get, wishParams(id)),
        write: (id: string, body: unknown) => postWishComment(jsonRequest(body), wishParams(id)),
    },
])('$name', ({ id, privId, read, write }) => {
    it('are never readable or writable by the owner (surprise)', async () => {
        signInAs('owner')
        expect((await read(id)).status).toBe(403)
        expect((await write(id, { text: 'hi' })).status).toBe(403)
    })

    it('anonymous visitors can read a public list but not post', async () => {
        signInAs(null)
        expect((await read(id)).status).toBe(200)
        expect((await write(id, { text: 'hi' })).status).toBe(401)
    })

    it('a guest posts and everyone with access reads it back', async () => {
        signInAs('guest', { name: 'Gus' })
        const created = await write(id, { text: '  hello  ' })
        expect(created.status).toBe(201)
        expect(await bodyOf(created)).toMatchObject({ text: 'hello', authorId: 'guest', authorName: 'Gus' })

        signInAs('other')
        const list = (await (await read(id)).json()) as { text: string }[]
        expect(list.map((c) => c.text)).toEqual(['hello'])
    })

    it('rejects empty text and truncates long text to 2000 characters', async () => {
        signInAs('guest')
        expect((await write(id, { text: '   ' })).status).toBe(400)
        const long = await bodyOf(await write(id, { text: 'x'.repeat(3000) }))
        expect((long.text as string).length).toBe(2000)
    })

    it('a private list is closed to strangers and open to invited guests', async () => {
        signInAs('stranger')
        expect((await read(privId)).status).toBe(403)
        expect((await write(privId, { text: 'hi' })).status).toBe(403)

        signInAs('invited', { email: 'invited@x.io' })
        expect((await write(privId, { text: 'hi' })).status).toBe(201)
    })
})

describe('unknown parents', () => {
    it('404s for a missing wishlist or wish', async () => {
        signInAs('guest')
        expect((await getListComments(get, listParams('nope'))).status).toBe(404)
        expect((await getWishComments(get, wishParams('nope'))).status).toBe(404)
    })
})
