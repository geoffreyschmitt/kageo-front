import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { parseContributions, readPotForViewer } from './readPot'

const pledge = (userId: string, amount: number, at = '2026-01-01') =>
    JSON.stringify({ userId, amount, contributedAt: at })

beforeEach(async () => {
    fake = createFakeKv()
    await fake.set('wishlist:L', { id: 'L', ownerId: 'owner', totalContributed: 90 })
    await fake.set('wishlist:L:pot', { creatorId: 'org', creatorName: 'Olivia', createdAt: '2026-01-01' })
    await fake.rpush('wishlist:L:contributions', pledge('org', 50), pledge('guest', 40), pledge('gone', 0))
    await fake.set('user:id:org', 'org@x.io')
    await fake.set('user:org@x.io', { id: 'org', email: 'org@x.io', name: 'Olivia' })
    await fake.set('user:id:guest', 'guest@x.io')
    await fake.set('user:guest@x.io', { id: 'guest', email: 'guest@x.io', name: 'Gus' })
})

describe('readPotForViewer role rules', () => {
    it('hides the pot from the wishlist owner (it is a surprise)', async () => {
        expect(await readPotForViewer({ wishlistId: 'L', userId: 'owner' })).toBeNull()
    })

    it('returns null when there is no pot or no wishlist', async () => {
        await fake.del('wishlist:L:pot')
        expect(await readPotForViewer({ wishlistId: 'L', userId: 'guest' })).toBeNull()
        expect(await readPotForViewer({ wishlistId: 'nope', userId: 'guest' })).toBeNull()
    })

    it('gives a guest totals and their own pledge, but no names or amounts of others', async () => {
        const view = await readPotForViewer({ wishlistId: 'L', userId: 'guest' })
        expect(view).toMatchObject({ isCreator: false, totalContributed: 90, myContribution: 40, participantCount: 2 })
        expect(view).not.toHaveProperty('contributors')
    })

    it('does not count a cancelled (0) pledge as a participant', async () => {
        const view = await readPotForViewer({ wishlistId: 'L', userId: null })
        expect(view?.participantCount).toBe(2)
    })

    it('gives the organiser the nominative list, largest first, with themselves tagged', async () => {
        const view = await readPotForViewer({ wishlistId: 'L', userId: 'org' })
        expect(view?.isCreator).toBe(true)
        expect(view?.contributors?.map((c) => [c.name, c.amount, c.isOrganiser])).toEqual([
            ['Olivia', 50, true],
            ['Gus', 40, false],
        ])
    })
})

describe('parseContributions', () => {
    it('skips malformed entries instead of throwing', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(parseContributions(['not json', pledge('a', 5)])).toHaveLength(1)
        warn.mockRestore()
    })

    it('accepts already-parsed objects and null', () => {
        expect(parseContributions([{ userId: 'a', amount: 1, contributedAt: 'x' }])).toHaveLength(1)
        expect(parseContributions(null)).toEqual([])
    })
})
