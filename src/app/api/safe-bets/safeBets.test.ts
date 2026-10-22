import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { bodyOf, jsonRequest, runAs, signInAs } from '@/test/route'

import type { TSafeBet } from '@/entities/safeBet'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/shared/config/authOptions', () => ({ authOptions: {} }))

import { DELETE, PATCH } from './[entryId]/route'
import { PUT as reorder } from './reorder/route'
import { GET, POST } from './route'

const params = (entryId: string) => ({ params: Promise.resolve({ entryId }) })
const stored = async (userId: string) => ((await fake.get(`user:${userId}:safeBets`)) ?? []) as TSafeBet[]
const create = async (title: string, userId = 'owner') => {
    signInAs(userId)
    return (await bodyOf(await POST(jsonRequest({ title })))) as unknown as TSafeBet
}

beforeEach(() => {
    fake = createFakeKv()
    signInAs('owner')
})

describe('authentication', () => {
    it('answers 401 on every verb without a session', async () => {
        signInAs(null)
        expect((await GET()).status).toBe(401)
        expect((await POST(jsonRequest({ title: 'x' }))).status).toBe(401)
        expect((await PATCH(jsonRequest({ title: 'x' }, 'PATCH'), params('a'))).status).toBe(401)
        expect((await DELETE(jsonRequest({}, 'DELETE'), params('a'))).status).toBe(401)
        expect((await reorder(jsonRequest({ ids: [] }, 'PUT'))).status).toBe(401)
    })
})

describe('create and list', () => {
    it('creates an entry with trimmed fields and lists it', async () => {
        const res = await POST(jsonRequest({ title: '  Perfume  ', description: ' Chanel ', imageUrl: ' https://x.io/a.png ' }))
        expect(res.status).toBe(201)
        const entry = (await bodyOf(res)) as unknown as TSafeBet
        expect(entry).toMatchObject({ title: 'Perfume', description: 'Chanel', imageUrl: 'https://x.io/a.png' })
        expect(entry.id).toBeTruthy()
        expect(new Date(entry.createdAt).toISOString()).toBe(entry.createdAt)

        const list = (await (await GET()).json()) as TSafeBet[]
        expect(list).toEqual([entry])
    })

    it('appends new entries last', async () => {
        await create('one')
        await create('two')
        expect((await stored('owner')).map((e) => e.title)).toEqual(['one', 'two'])
    })

    it('only shows a user their own entries', async () => {
        await create('mine', 'owner')
        await create('theirs', 'other')
        signInAs('owner')
        const list = (await (await GET()).json()) as TSafeBet[]
        expect(list.map((e) => e.title)).toEqual(['mine'])
    })

    it.each([
        ['whitespace title', { title: '   ' }],
        ['javascript: image', { title: 'x', imageUrl: 'javascript:alert(1)' }],
        ['10 000-char description', { title: 'x', description: 'a'.repeat(10_000) }],
    ])('rejects %s with 400', async (_name, body) => {
        const res = await POST(jsonRequest(body))
        expect(res.status).toBe(400)
        expect(await bodyOf(res)).toHaveProperty('message')
        expect(await stored('owner')).toEqual([])
    })

    it('answers 409 on the 31st entry', async () => {
        const now = new Date().toISOString()
        await fake.set(
            'user:owner:safeBets',
            Array.from({ length: 30 }, (_, i) => ({ id: `e${i}`, title: `t${i}`, createdAt: now })),
        )
        expect((await POST(jsonRequest({ title: 'one too many' }))).status).toBe(409)
        expect(await stored('owner')).toHaveLength(30)
    })
})

describe('edit', () => {
    it('replaces the fields and keeps id and createdAt', async () => {
        const entry = await create('old')
        const res = await PATCH(jsonRequest({ title: ' new ', description: 'd' }, 'PATCH'), params(entry.id))
        expect(res.status).toBe(200)
        expect(await bodyOf(res)).toEqual({ id: entry.id, createdAt: entry.createdAt, title: 'new', description: 'd' })
        expect(await stored('owner')).toHaveLength(1)
    })

    it('rejects invalid input with 400', async () => {
        const entry = await create('old')
        expect((await PATCH(jsonRequest({ title: ' ' }, 'PATCH'), params(entry.id))).status).toBe(400)
    })

    it("answers 404 for another user's entry and leaves it untouched", async () => {
        const entry = await create('theirs', 'other')
        signInAs('owner')
        expect((await PATCH(jsonRequest({ title: 'hijack' }, 'PATCH'), params(entry.id))).status).toBe(404)
        expect((await stored('other'))[0].title).toBe('theirs')
    })
})

describe('delete', () => {
    it('removes the entry and its comments list', async () => {
        const a = await create('a')
        const b = await create('b')
        await fake.rpush(`safebet:${a.id}:comments`, JSON.stringify({ text: 'hi' }))
        signInAs('owner')

        const res = await DELETE(jsonRequest({}, 'DELETE'), params(a.id))
        expect(res.status).toBe(200)
        expect(await bodyOf(res)).toEqual({ ok: true })
        expect((await stored('owner')).map((e) => e.id)).toEqual([b.id])
        expect(fake.has(`safebet:${a.id}:comments`)).toBe(false)
    })

    it('answers 404 when absent or owned by someone else', async () => {
        const entry = await create('theirs', 'other')
        signInAs('owner')
        expect((await DELETE(jsonRequest({}, 'DELETE'), params(entry.id))).status).toBe(404)
        expect(await stored('other')).toHaveLength(1)
    })
})

describe('reorder', () => {
    it('applies a valid permutation', async () => {
        const a = await create('a')
        const b = await create('b')
        const c = await create('c')
        signInAs('owner')
        const res = await reorder(jsonRequest({ ids: [c.id, a.id, b.id] }, 'PUT'))
        expect(res.status).toBe(200)
        expect(((await res.json()) as TSafeBet[]).map((e) => e.title)).toEqual(['c', 'a', 'b'])
        expect((await stored('owner')).map((e) => e.title)).toEqual(['c', 'a', 'b'])
    })

    it('rejects a missing, extra or duplicate id with 400', async () => {
        const a = await create('a')
        const b = await create('b')
        signInAs('owner')
        for (const ids of [[a.id], [a.id, b.id, 'zzz'], [a.id, a.id], [a.id, 'zzz'], 'nope']) {
            expect((await reorder(jsonRequest({ ids }, 'PUT'))).status).toBe(400)
        }
        expect((await stored('owner')).map((e) => e.title)).toEqual(['a', 'b'])
    })
})

describe('concurrency', () => {
    beforeEach(() => {
        fake = createFakeKv({ latency: true })
    })

    it('10 concurrent creates all land', async () => {
        const res = await Promise.all(
            Array.from({ length: 10 }, (_, i) => runAs('owner', () => POST(jsonRequest({ title: `t${i}` })))),
        )
        const created = res.filter((r) => r.status === 201)
        for (const r of res) expect([201, 503]).toContain(r.status)
        const ids = new Set((await stored('owner')).map((e) => e.id))
        expect(ids.size).toBe(created.length)
        for (const r of created) expect(ids.has(((await bodyOf(r)) as unknown as TSafeBet).id)).toBe(true)
    })

    it('35 concurrent creates never exceed 30 and lose nothing', async () => {
        const res = await Promise.all(
            Array.from({ length: 35 }, (_, i) => runAs('owner', () => POST(jsonRequest({ title: `t${i}` })))),
        )
        const created = res.filter((r) => r.status === 201)
        for (const r of res) expect([201, 409, 503]).toContain(r.status)
        const entries = await stored('owner')
        expect(entries.length).toBeLessThanOrEqual(30)
        expect(entries.length).toBe(created.length)
        const ids = new Set(entries.map((e) => e.id))
        for (const r of created) expect(ids.has(((await bodyOf(r)) as unknown as TSafeBet).id)).toBe(true)
    })
})
