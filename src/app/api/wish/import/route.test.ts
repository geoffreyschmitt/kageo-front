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
vi.mock('@/shared/lib/fetchHtml', () => ({ fetchHtml: vi.fn() }))

import { fetchHtml } from '@/shared/lib/fetchHtml'

import { POST } from './route'

const page = `<html><head><title>x</title>
<meta property="og:title" content="Nice Lamp">
<meta property="og:image" content="https://shop.example/lamp.jpg"></head></html>`

beforeEach(() => {
    fake = createFakeKv()
    delete process.env.RATE_LIMIT_MULTIPLIER
    vi.mocked(fetchHtml).mockReset()
    vi.mocked(fetchHtml).mockResolvedValue({ html: page, finalUrl: 'https://shop.example/p/1' })
})

describe('POST /api/wish/import', () => {
    it('answers 401 when signed out and consumes no budget', async () => {
        signInAs(null)
        for (let i = 0; i < getRule('import').limit + 1; i++) {
            expect((await POST(jsonRequest({ url: 'https://shop.example/p/1' }))).status).toBe(401)
        }
        signInAs('u1')
        expect((await POST(jsonRequest({ url: 'https://shop.example/p/1' }))).status).toBe(200)
        expect(fetchHtml).toHaveBeenCalledTimes(1)
    })

    it.each([
        ['missing url', {}],
        ['non-string url', { url: 5 }],
        ['over-long url', { url: `https://x.com/${'a'.repeat(3000)}` }],
        ['non-http scheme', { url: 'ftp://x.com' }],
        ['not a url', { url: 'nope' }],
    ])('answers 400 for %s without fetching', async (_name, body) => {
        signInAs('u1')
        const res = await POST(jsonRequest(body))
        expect(res.status).toBe(400)
        expect(typeof (await bodyOf(res)).message).toBe('string')
        expect(fetchHtml).not.toHaveBeenCalled()
    })

    it('answers 400 for an unparseable body', async () => {
        signInAs('u1')
        const req = new Request('http://localhost/api/test', { method: 'POST', body: 'not json' })
        expect((await POST(req as never)).status).toBe(400)
    })

    it('returns extracted fields with found true', async () => {
        signInAs('u1')
        const res = await POST(jsonRequest({ url: 'https://shop.example/p/1' }))
        expect(res.status).toBe(200)
        const body = await bodyOf(res)
        expect(body.found).toBe(true)
        expect(body.fields).toMatchObject({ name: 'Nice Lamp', imageUrl: 'https://shop.example/lamp.jpg' })
    })

    it('answers found false when the fetch yields nothing', async () => {
        signInAs('u1')
        vi.mocked(fetchHtml).mockResolvedValue(null)
        const res = await POST(jsonRequest({ url: 'https://shop.example/p/1' }))
        expect(res.status).toBe(200)
        expect(await bodyOf(res)).toEqual({ found: false, fields: {} })
    })

    it('answers found false when the page has no usable fields', async () => {
        signInAs('u1')
        vi.mocked(fetchHtml).mockResolvedValue({ html: '<html></html>', finalUrl: 'https://shop.example/' })
        const res = await POST(jsonRequest({ url: 'https://shop.example/p/1' }))
        expect(res.status).toBe(200)
        expect(await bodyOf(res)).toEqual({ found: false, fields: {} })
    })

    it('answers found false when the fetch throws', async () => {
        signInAs('u1')
        vi.mocked(fetchHtml).mockRejectedValue(new Error('boom internal detail'))
        const res = await POST(jsonRequest({ url: 'https://shop.example/p/1' }))
        expect(res.status).toBe(200)
        expect(await bodyOf(res)).toEqual({ found: false, fields: {} })
    })

    it('allows the limit then answers 429 with Retry-After', async () => {
        signInAs('u1')
        const { limit } = getRule('import')
        expect(limit).toBe(20)
        for (let i = 0; i < limit; i++) {
            expect((await POST(jsonRequest({ url: 'https://shop.example/p/1' }))).status).toBe(200)
        }
        const blocked = await POST(jsonRequest({ url: 'https://shop.example/p/1' }))
        expect(blocked.status).toBe(429)
        expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    })
})
