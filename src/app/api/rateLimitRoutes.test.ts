import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { jsonRequest, signInAs } from '@/test/route'

import { getRule, type TWriteLimit } from '@/shared/config/rateLimits'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/shared/config/authOptions', () => ({ authOptions: {} }))

import { GET as exportUser } from './user/export/route'
import { DELETE as deleteMe, PATCH as patchMe } from './user/me/route'
import { POST as changePassword } from './user/password/route'
import { POST as postWishComment } from './wish/[wishId]/comments/route'
import { PUT as putWish } from './wish/[wishId]/route'
import { POST as cancelWish } from './wish/cancel/route'
import { PATCH as patchWishContribute, POST as postWishContribute } from './wish/contribute/route'
import { POST as deleteWish } from './wish/delete/route'
import { POST as importWish } from './wish/import/route'
import { POST as markPurchased } from './wish/mark-purchased/route'
import { GET as exportWishPot } from './wish/pot/export/route'
import { POST as postWishPot } from './wish/pot/route'
import { POST as removePurchased } from './wish/remove-purchased/route'
import { POST as reserveWish } from './wish/reserve/route'
import { POST as postWish } from './wish/route'
import { POST as postListComment } from './wishlist/[id]/comments/route'
import { DELETE as deleteList, PUT as putList } from './wishlist/[id]/route'
import { PATCH as patchListContribute, POST as postListContribute } from './wishlist/contribute/route'
import { GET as exportListPot } from './wishlist/pot/export/route'
import { POST as postListPot } from './wishlist/pot/route'
import { POST as postWishlist } from './wishlist/route'
import { POST as shareList } from './wishlist/share/route'

type TCase = { name: string; group: TWriteLimit; call: () => Promise<Response> }

// Calls carry junk bodies on purpose: the limiter runs before validation, so a call counts
// whether it ends in 400, 403 or 404. Extend this table to cover more limited routes.
const getRequest = () => new NextRequest('http://localhost/api/test')
const wishParams = { params: Promise.resolve({ wishId: 'w1' }) }
const listParams = { params: Promise.resolve({ id: 'l1' }) }

export const cases: TCase[] = [
    { name: 'POST /api/wish/reserve', group: 'reserve', call: () => reserveWish(jsonRequest({})) },
    { name: 'POST /api/wish/cancel', group: 'reserve', call: () => cancelWish(jsonRequest({})) },
    { name: 'POST /api/wish/contribute', group: 'contribute', call: () => postWishContribute(jsonRequest({})) },
    {
        name: 'PATCH /api/wish/contribute',
        group: 'contribute',
        call: () => patchWishContribute(jsonRequest({}, 'PATCH')),
    },
    { name: 'POST /api/wishlist/contribute', group: 'contribute', call: () => postListContribute(jsonRequest({})) },
    {
        name: 'PATCH /api/wishlist/contribute',
        group: 'contribute',
        call: () => patchListContribute(jsonRequest({}, 'PATCH')),
    },
    {
        name: 'POST /api/wish/[wishId]/comments',
        group: 'comment',
        call: () => postWishComment(jsonRequest({ text: 'hi' }), wishParams),
    },
    {
        name: 'POST /api/wishlist/[id]/comments',
        group: 'comment',
        call: () => postListComment(jsonRequest({ text: 'hi' }), listParams),
    },
    { name: 'POST /api/wish', group: 'suggest', call: () => postWish(jsonRequest({})) },
    { name: 'POST /api/wish/import', group: 'import', call: () => importWish(jsonRequest({})) },
    { name: 'POST /api/wishlist/share', group: 'invite', call: () => shareList(jsonRequest({})) },
    { name: 'POST /api/wishlist', group: 'write', call: () => postWishlist(jsonRequest({})) },
    { name: 'PUT /api/wishlist/[id]', group: 'write', call: () => putList(jsonRequest({}, 'PUT'), listParams) },
    { name: 'DELETE /api/wishlist/[id]', group: 'write', call: () => deleteList(jsonRequest({}, 'DELETE'), listParams) },
    { name: 'PUT /api/wish/[wishId]', group: 'write', call: () => putWish(jsonRequest({}, 'PUT'), wishParams) },
    { name: 'POST /api/wish/delete', group: 'write', call: () => deleteWish(jsonRequest({})) },
    { name: 'POST /api/wish/mark-purchased', group: 'write', call: () => markPurchased(jsonRequest({})) },
    { name: 'POST /api/wish/remove-purchased', group: 'write', call: () => removePurchased(jsonRequest({})) },
    { name: 'POST /api/wish/pot', group: 'write', call: () => postWishPot(jsonRequest({})) },
    { name: 'POST /api/wishlist/pot', group: 'write', call: () => postListPot(jsonRequest({})) },
    { name: 'PATCH /api/user/me', group: 'write', call: () => patchMe(jsonRequest({}, 'PATCH')) },
    { name: 'DELETE /api/user/me', group: 'write', call: () => deleteMe(jsonRequest({}, 'DELETE')) },
    { name: 'POST /api/user/password', group: 'write', call: () => changePassword(jsonRequest({})) },
    { name: 'GET /api/user/export', group: 'write', call: () => exportUser(getRequest()) },
    { name: 'GET /api/wish/pot/export', group: 'write', call: () => exportWishPot(getRequest()) },
    { name: 'GET /api/wishlist/pot/export', group: 'write', call: () => exportListPot(getRequest()) },
]

beforeEach(() => {
    fake = createFakeKv()
    delete process.env.RATE_LIMIT_MULTIPLIER
})

describe.each(cases)('$name', ({ group, call }) => {
    it('allows the limit then answers 429 with Retry-After', async () => {
        signInAs('u1')
        const { limit } = getRule(group)
        for (let i = 0; i < limit; i++) expect((await call()).status).not.toBe(429)
        const blocked = await call()
        expect(blocked.status).toBe(429)
        expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    })

    it('signed-out calls get 401 and consume no budget', async () => {
        signInAs(null)
        const { limit } = getRule(group)
        for (let i = 0; i < limit + 1; i++) expect((await call()).status).toBe(401)

        signInAs('u1')
        expect((await call()).status).not.toBe(429)
    })

    it('is counted per user', async () => {
        signInAs('u1')
        for (let i = 0; i < getRule(group).limit + 1; i++) await call()
        signInAs('u2')
        expect((await call()).status).not.toBe(429)
    })
})

describe('groups', () => {
    it('exhausting reserve does not block comment', async () => {
        signInAs('u1')
        const reserve = cases.find((c) => c.group === 'reserve')!
        const comment = cases.find((c) => c.group === 'comment')!
        for (let i = 0; i < getRule('reserve').limit + 1; i++) await reserve.call()
        expect((await reserve.call()).status).toBe(429)
        expect((await comment.call()).status).not.toBe(429)
    })

    it('reserve and cancel share one counter', async () => {
        signInAs('u1')
        const { limit } = getRule('reserve')
        for (let i = 0; i < limit; i++) await (i % 2 ? cancelWish(jsonRequest({})) : reserveWish(jsonRequest({})))
        expect((await cancelWish(jsonRequest({}))).status).toBe(429)
        expect((await reserveWish(jsonRequest({}))).status).toBe(429)
    })

    it('POST /api/wish allows 60 calls and blocks the 61st', async () => {
        signInAs('u1')
        expect(getRule('suggest').limit).toBe(60)
        const suggest = cases.find((c) => c.group === 'suggest')!
        for (let i = 0; i < 60; i++) expect((await suggest.call()).status).toBe(400)
        expect((await suggest.call()).status).toBe(429)
    })

    it('Tier 3 routes share one write pool per user', async () => {
        signInAs('u1')
        expect(getRule('write').limit).toBe(120)
        const [first, second] = cases.filter((c) => c.group === 'write')
        for (let i = 0; i < 60; i++) expect((await first.call()).status).not.toBe(429)
        for (let i = 0; i < 60; i++) expect((await second.call()).status).not.toBe(429)
        expect((await first.call()).status).toBe(429)
        expect((await second.call()).status).toBe(429)
    })

    it('does not limit comment GETs', async () => {
        const { GET } = await import('./wish/[wishId]/comments/route')
        signInAs('u1')
        for (let i = 0; i < getRule('comment').limit + 5; i++) {
            const res = await GET(new NextRequest('http://localhost/api/test'), wishParams)
            expect(res.status).toBe(404)
        }
    })
})
