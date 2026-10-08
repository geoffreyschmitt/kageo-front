import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { jsonRequest, runAs } from '@/test/route'

// A slow fake KV makes concurrent handlers interleave at every await, like real round-trips.
let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/shared/config/authOptions', () => ({ authOptions: {} }))

import { PUT as putWish } from './wish/[wishId]/route'
import { POST as cancel } from './wish/cancel/route'
import { POST as contributeToWish } from './wish/contribute/route'
import { POST as markPurchased } from './wish/mark-purchased/route'
import { POST as reserve } from './wish/reserve/route'
import { PUT as putWishlist } from './wishlist/[id]/route'
import { POST as contributeToList } from './wishlist/contribute/route'

const wishParams = { params: Promise.resolve({ wishId: 'w' }) }
const listParams = { params: Promise.resolve({ id: 'L' }) }
const wish = async () => (await fake.get('wish:w')) as Record<string, unknown>

beforeEach(async () => {
    fake = createFakeKv({ latency: true })
    await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', name: 'Birthday', eventDate: '2026-12-01', isPublic: true })
    await fake.set('wish:w', { id: 'w', wishlistId: 'L', name: 'Lamp', price: 100, status: 'wanted' })
})

const as = runAs

describe('reservations', () => {
    it('two people reserving the same wish at once: exactly one wins', async () => {
        const [a, b] = await Promise.all([
            as('alice', () => reserve(jsonRequest({ wishId: 'w' }))),
            as('bob', () => reserve(jsonRequest({ wishId: 'w' }))),
        ])

        expect([a.status, b.status].sort()).toEqual([200, 409])
        const winner = a.status === 200 ? 'alice' : 'bob'
        expect((await wish()).reservedBy).toBe(winner)
    })

    it('an owner edit and a guest reservation at once both land', async () => {
        const [edit, res] = await Promise.all([
            as('owner', () => putWish(jsonRequest({ name: 'Desk lamp', price: 100 }, 'PUT'), wishParams)),
            as('alice', () => reserve(jsonRequest({ wishId: 'w' }))),
        ])

        expect([edit.status, res.status]).toEqual([200, 200])
        expect(await wish()).toMatchObject({ name: 'Desk lamp', status: 'reserved', reservedBy: 'alice' })
    })

    it('cancelling and someone else buying at once never leaves a half-state', async () => {
        await fake.set('wish:w', { id: 'w', wishlistId: 'L', name: 'Lamp', price: 100, status: 'reserved', reservedBy: 'alice' })
        await Promise.all([
            as('alice', () => cancel(jsonRequest({ wishId: 'w' }))),
            as('bob', () => markPurchased(jsonRequest({ wishId: 'w' }))),
        ])

        const w = await wish()
        // Either order is valid; what must not happen is a purchase wiped by the cancel's stale write.
        if (w.purchasedBy) expect(w.status).toBe('purchased')
        else expect(w.status).toBe('wanted')
    })

    it('an edit that changes the price and a pledge at once keep the funded status consistent', async () => {
        await fake.set('wish:w:pot', { creatorId: 'org' })
        await Promise.all([
            as('owner', () => putWish(jsonRequest({ name: 'Lamp', price: 50 }, 'PUT'), wishParams)),
            as('alice', () => contributeToWish(jsonRequest({ wishId: 'w', amount: 50 }))),
        ])

        // 50 pledged against a price of 50: funded, whichever ran first.
        expect(await wish()).toMatchObject({ price: 50, status: 'funded' })
    })
})

describe('wishlist record', () => {
    it('an owner edit and a pledge at once: the title and the total both survive', async () => {
        await fake.set('wishlist:L:pot', { creatorId: 'org' })
        await Promise.all([
            as('owner', () =>
                putWishlist(jsonRequest({ name: 'Renamed', eventDate: '2026-12-01', isPublic: true }, 'PUT'), listParams),
            ),
            as('alice', () => contributeToList(jsonRequest({ wishlistId: 'L', amount: 30 }))),
        ])

        expect(await fake.get('wishlist:L')).toMatchObject({ name: 'Renamed', totalContributed: 30 })
    })
})
