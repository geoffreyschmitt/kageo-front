import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { bodyOf, jsonRequest, signInAs } from '@/test/route'

import { getRule } from '@/shared/config/rateLimits'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/shared/config/authOptions', () => ({ authOptions: {} }))

import { GET, POST } from './wishlist/[id]/safe-bets/[entryId]/comments/route'

const get = new NextRequest('http://localhost/api/test')
const params = (id: string, entryId: string) => ({ params: Promise.resolve({ id, entryId }) })
const read = (id: string, entryId = 'e1') => GET(get, params(id, entryId))
const write = (id: string, body: unknown, entryId = 'e1') => POST(jsonRequest(body), params(id, entryId))

const entry = (id: string) => ({ id, title: 'Bet', createdAt: '2026-01-01T00:00:00.000Z' })

beforeEach(async () => {
    fake = createFakeKv()
    await fake.set('wishlist:PUB', { id: 'PUB', ownerId: 'owner', isPublic: true })
    await fake.set('wishlist:PRIV', { id: 'PRIV', ownerId: 'owner', isPublic: false })
    await fake.sadd('wishlist:PRIV:invitees', 'invited@x.io')
    await fake.set('user:owner:safeBets', [entry('e1')])
    await fake.set('user:other:safeBets', [entry('foreign')])
})

describe('safe-bet comments', () => {
    it('are never readable or writable by the owner (surprise)', async () => {
        signInAs('owner')
        expect((await read('PUB')).status).toBe(403)
        expect((await write('PUB', { text: 'hi' })).status).toBe(403)
    })

    it('anonymous visitors can read a public list but not post', async () => {
        signInAs(null)
        expect((await read('PUB')).status).toBe(200)
        expect((await write('PUB', { text: 'hi' })).status).toBe(401)
    })

    it('a guest posts and everyone with access reads it back', async () => {
        signInAs('guest', { name: 'Gus' })
        const created = await write('PUB', { text: '  hello  ' })
        expect(created.status).toBe(201)
        expect(await bodyOf(created)).toMatchObject({ text: 'hello', authorId: 'guest', authorName: 'Gus' })

        signInAs('other')
        const list = (await (await read('PUB')).json()) as { text: string }[]
        expect(list.map((c) => c.text)).toEqual(['hello'])
    })

    it('rejects empty text and truncates long text to 2000 characters', async () => {
        signInAs('guest')
        expect((await write('PUB', { text: '   ' })).status).toBe(400)
        const long = await bodyOf(await write('PUB', { text: 'x'.repeat(3000) }))
        expect((long.text as string).length).toBe(2000)
    })

    it('a private list is closed to strangers and open to invited guests', async () => {
        signInAs('stranger')
        expect((await read('PRIV')).status).toBe(403)
        expect((await write('PRIV', { text: 'hi' })).status).toBe(403)

        signInAs('invited', { email: 'invited@x.io' })
        expect((await write('PRIV', { text: 'hi' })).status).toBe(201)
    })

    it('404s for a missing wishlist', async () => {
        signInAs('guest')
        expect((await read('nope')).status).toBe(404)
        expect((await write('nope', { text: 'hi' })).status).toBe(404)
    })

    it('404s for an entry not in the wishlist owner entries, including another owner entry', async () => {
        signInAs('guest')
        for (const entryId of ['missing', 'foreign']) {
            expect((await read('PUB', entryId)).status).toBe(404)
            expect((await write('PUB', { text: 'hi' }, entryId)).status).toBe(404)
        }
        expect(await fake.lrange('safebet:foreign:comments', 0, -1)).toEqual([])
    })

    it('answers 429 after the comment limit', async () => {
        signInAs('u1')
        const { limit } = getRule('comment')
        for (let i = 0; i < limit; i++) expect((await write('PUB', { text: 'hi' })).status).not.toBe(429)
        const blocked = await write('PUB', { text: 'hi' })
        expect(blocked.status).toBe(429)
        expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    })
})
