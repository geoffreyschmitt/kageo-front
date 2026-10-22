import type { ReactElement } from 'react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { signInAs } from '@/test/route'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/shared/config/authOptions', () => ({ authOptions: {} }))
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }))

// notFound()/redirect() end rendering by throwing; mimic that so tests can assert on it.
vi.mock('next/navigation', () => ({
    notFound: () => {
        throw new Error('NEXT_NOT_FOUND')
    },
    redirect: (to: string) => {
        throw new Error(`NEXT_REDIRECT:${to}`)
    },
}))

// The client views are exercised by the browser, not here: keep the stubs so the page output
// is an element whose props are what the server decided to send.
vi.mock('./wishlist/[id]/WishlistPageClient', () => ({ default: () => null }))
vi.mock('./wishlists/WishlistsPageClient', () => ({ default: () => null }))
vi.mock('./history/HistoryPageClient', () => ({ default: () => null }))
vi.mock('@/views/profile/ui/ProfilePage', () => ({ default: () => null }))
vi.mock('@/views/publicProfile/ui/PublicProfilePage', () => ({ default: () => null }))

import HistoryPage from './history/page'
import ProfilePageRoute from './profile/page'
import PublicProfileRoute from './u/[id]/page'
import WishlistPage from './wishlist/[id]/page'
import WishlistsPage from './wishlists/page'

type TProps = Record<string, unknown>
const propsOf = (element: unknown) => (element as ReactElement<TProps>).props

const wishlistPage = (id: string, mode?: string) =>
    WishlistPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ mode }) })

const PAST = '2000-01-01T00:00:00.000Z'
const FUTURE = '2999-01-01T00:00:00.000Z'

const user = async (id: string, name: string, extra: Record<string, unknown> = {}) => {
    await fake.set(`user:${id}@x.io`, { id, email: `${id}@x.io`, name, ...extra })
    await fake.set(`user:id:${id}`, `${id}@x.io`)
}

const list = async (id: string, ownerId: string, extra: Record<string, unknown> = {}) => {
    await fake.set(`wishlist:${id}`, {
        id, ownerId, name: `List ${id}`, description: '', isPublic: true, eventDate: FUTURE, createdAt: PAST, ...extra,
    })
    await fake.sadd(`user:${ownerId}:wishlists`, id)
}

const wish = async (id: string, wishlistId: string, extra: Record<string, unknown> = {}) => {
    await fake.set(`wish:${id}`, {
        id, wishlistId, name: `Wish ${id}`, description: '', price: 100, currency: '€', imageUrl: '',
        priority: 'medium', status: 'wanted', createdAt: PAST, ...extra,
    })
    await fake.sadd(`wishlist:${wishlistId}:wishes`, id)
}

beforeEach(async () => {
    fake = createFakeKv()
    await user('owner', 'Olivia', { isPublic: true })
    await user('guest', 'Gus')
    await user('bob', 'Bob')
})

describe('wishlist page: access', () => {
    it('404s for an unknown wishlist', async () => {
        signInAs('guest')
        await expect(wishlistPage('nope')).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('sends strangers away from a private list but lets the owner and invited guests in', async () => {
        await list('P', 'owner', { isPublic: false })
        await fake.sadd('wishlist:P:invitees', 'guest@x.io')

        signInAs(null)
        await expect(wishlistPage('P')).rejects.toThrow('NEXT_REDIRECT:/')
        signInAs('bob')
        await expect(wishlistPage('P')).rejects.toThrow('NEXT_REDIRECT:/')

        signInAs('guest')
        expect(propsOf(await wishlistPage('P'))).toMatchObject({ userIsOwner: false, isInvited: true })
        signInAs('owner')
        expect(propsOf(await wishlistPage('P'))).toMatchObject({ userIsOwner: true })
    })

    it('shows a public list to anonymous visitors, who are not logged in', async () => {
        await list('L', 'owner')
        signInAs(null)
        expect(propsOf(await wishlistPage('L'))).toMatchObject({ isLoggedIn: false, userIsOwner: false, userId: '' })
    })

    it('remounts the client when the signed-in user changes, so logging in from the page refreshes its state', async () => {
        await list('L', 'owner')
        signInAs(null)
        const anonymous = (await wishlistPage('L')) as ReactElement
        signInAs('guest')
        const signedIn = (await wishlistPage('L')) as ReactElement
        signInAs('bob')
        const other = (await wishlistPage('L')) as ReactElement

        expect(anonymous.key).not.toBe(signedIn.key)
        expect(signedIn.key).not.toBe(other.key)
        expect(signedIn.key).toBe(((await (signInAs('guest'), wishlistPage('L'))) as ReactElement).key)
    })

    it('flags history mode only for ?mode=history', async () => {
        await list('L', 'owner')
        signInAs('guest')
        expect(propsOf(await wishlistPage('L', 'history')).isHistory).toBe(true)
        expect(propsOf(await wishlistPage('L')).isHistory).toBe(false)
    })
})

describe('wishlist page: the pot is a surprise for the owner', () => {
    beforeEach(async () => {
        await list('L', 'owner', { totalContributed: 60 })
        await wish('w', 'L', { status: 'funded' })
        await fake.set('wishlist:L:pot', { creatorId: 'bob', creatorName: 'Bob', createdAt: PAST })
        await fake.rpush('wishlist:L:contributions', JSON.stringify({ userId: 'guest', amount: 60, contributedAt: PAST }))
        await fake.set('wish:w:pot', { creatorId: 'bob', creatorName: 'Bob', createdAt: PAST })
        await fake.rpush('wish:w:contributions', JSON.stringify({ userId: 'guest', amount: 100, contributedAt: PAST }))
        await fake.rpush('wish:w:comments', JSON.stringify({ id: 'c', authorId: 'guest', authorName: 'Gus', text: 'hi' }))
    })

    it('gives the owner no pot, no gift pot, no comment count, and hides "funded"', async () => {
        signInAs('owner')
        const props = propsOf(await wishlistPage('L'))
        const [item] = props.initialItems as TProps[]

        expect(props.initialPot).toBeNull()
        expect(item.giftPot).toBeUndefined()
        expect(item.commentCount).toBeUndefined()
        expect(item.status).toBe('wanted')
        expect(JSON.stringify(props)).not.toContain('Bob')
    })

    it('still tells the owner the list has activity, so it cannot be deleted', async () => {
        signInAs('owner')
        expect(propsOf(await wishlistPage('L')).hasActivity).toBe(true)
    })

    it('gives a guest the pot, the gift pot, the comment count and the real status', async () => {
        signInAs('guest')
        const props = propsOf(await wishlistPage('L'))
        const [item] = props.initialItems as TProps[]

        expect(props.initialPot).not.toBeNull()
        expect(item.giftPot).not.toBeNull()
        expect(item.commentCount).toBe(1)
        expect(item.status).toBe('funded')
    })

    it('reports no activity on a fresh list', async () => {
        await list('Q', 'owner')
        await wish('x', 'Q')
        signInAs('owner')
        expect(propsOf(await wishlistPage('Q')).hasActivity).toBe(false)
    })
})

describe('wishlist page: reservations and purchases are a surprise for the owner', () => {
    const seed = async (listId: string, eventDate: string) => {
        await list(listId, 'owner', { eventDate })
        await wish(`${listId}-wanted`, listId)
        await wish(`${listId}-reserved`, listId, { status: 'reserved', reservedBy: 'guest' })
        await wish(`${listId}-bought`, listId, { status: 'purchased', purchasedBy: 'bob' })
    }
    const statuses = (props: TProps) =>
        Object.fromEntries((props.initialItems as TProps[]).map((i) => [i.id, i.status]))

    it('shows the owner every wish as wanted, with nobody named', async () => {
        await seed('L', FUTURE)
        signInAs('owner')
        const props = propsOf(await wishlistPage('L'))

        expect(statuses(props)).toEqual({ 'L-wanted': 'wanted', 'L-reserved': 'wanted', 'L-bought': 'wanted' })
        const payload = JSON.stringify(props)
        expect(payload).not.toContain('Gus')
        expect(payload).not.toContain('Bob')
        expect(payload).not.toContain('reservedBy')
        expect(payload).not.toContain('purchasedBy')
    })

    it('still tells the owner the list has activity, so it cannot be deleted', async () => {
        await seed('L', FUTURE)
        signInAs('owner')
        expect(propsOf(await wishlistPage('L')).hasActivity).toBe(true)
    })

    it('shows a guest the real statuses and who did what', async () => {
        await seed('L', FUTURE)
        signInAs('guest')
        const props = propsOf(await wishlistPage('L'))

        expect(statuses(props)).toEqual({ 'L-wanted': 'wanted', 'L-reserved': 'reserved', 'L-bought': 'purchased' })
        expect(JSON.stringify(props)).toContain('Bob')
    })

    it('does not let the owner unmask a live list with ?mode=history', async () => {
        await seed('L', FUTURE)
        signInAs('owner')
        const props = propsOf(await wishlistPage('L', 'history'))

        expect(statuses(props)).toEqual({ 'L-wanted': 'wanted', 'L-reserved': 'wanted', 'L-bought': 'wanted' })
        expect(JSON.stringify(props)).not.toContain('Bob')
    })

    it('reveals who gave what once the event is over and the owner opens it from history', async () => {
        await seed('H', PAST)
        signInAs('owner')
        const props = propsOf(await wishlistPage('H', 'history'))

        expect(statuses(props)).toEqual({ 'H-wanted': 'wanted', 'H-reserved': 'reserved', 'H-bought': 'purchased' })
        expect(JSON.stringify(props)).toContain('Bob')
    })

    it('keeps a finished list masked unless it is opened from history', async () => {
        await seed('H', PAST)
        signInAs('owner')
        expect(statuses(propsOf(await wishlistPage('H')))).toEqual({
            'H-wanted': 'wanted', 'H-reserved': 'wanted', 'H-bought': 'wanted',
        })
    })

    it('keeps the pot hidden from the owner even in history', async () => {
        await list('H', 'owner', { eventDate: PAST })
        await wish('H-funded', 'H', { status: 'funded' })
        signInAs('owner')
        expect(statuses(propsOf(await wishlistPage('H', 'history')))).toEqual({ 'H-funded': 'wanted' })
    })
})

describe('wishlist page: safe bets are a surprise for the owner', () => {
    const SECRET = 'distinctive-safebet-comment'

    beforeEach(async () => {
        await list('L', 'owner')
        await fake.set('user:owner:safeBets', [{ id: 'sb1', title: 'Chocolates', createdAt: PAST }])
        await fake.rpush('safebet:sb1:comments', JSON.stringify({ id: 'c', authorId: 'guest', authorName: 'Gus', text: SECRET }))
    })

    it('gives the owner no safe bets and none of their comments', async () => {
        signInAs('owner')
        const props = propsOf(await wishlistPage('L'))

        expect(props.safeBets).toEqual([])
        expect(JSON.stringify(props)).not.toContain(SECRET)
    })

    it('gives a guest the safe bets with their comment count', async () => {
        signInAs('guest')
        const props = propsOf(await wishlistPage('L'))

        expect((props.safeBets as TProps[])[0]).toMatchObject({ id: 'sb1', commentCount: 1 })
    })
})

describe('wishlist page: details', () => {
    it('resolves reserver and purchaser ids to names, never raw ids', async () => {
        await list('L', 'owner')
        await wish('w1', 'L', { status: 'reserved', reservedBy: 'bob' })
        await wish('w2', 'L', { status: 'purchased', purchasedBy: 'guest' })
        signInAs('guest')

        const items = propsOf(await wishlistPage('L')).initialItems as TProps[]
        const byId = Object.fromEntries(items.map((i) => [i.id as string, i]))
        expect(byId.w1.reservedByName).toBe('Bob')
        expect(byId.w2.purchasedByName).toBe('Gus')
    })

    it('links to the owner profile only for guests, and only when it is public', async () => {
        await list('L', 'owner')
        signInAs('guest')
        expect(propsOf(await wishlistPage('L')).ownerProfileUrl).toBe('/u/owner')
        signInAs('owner')
        expect(propsOf(await wishlistPage('L')).ownerProfileUrl).toBeNull()

        await user('owner', 'Olivia', { isPublic: false })
        signInAs('guest')
        expect(propsOf(await wishlistPage('L')).ownerProfileUrl).toBeNull()
    })

    it('defaults the currency and suggestions for lists created before those fields', async () => {
        await list('L', 'owner')
        signInAs('guest')
        expect(propsOf(await wishlistPage('L'))).toMatchObject({ currency: '€', allowSuggestions: true, ownerName: 'Olivia' })
    })
})

describe('wishlists page', () => {
    it('redirects when signed out', async () => {
        signInAs(null)
        await expect(WishlistsPage()).rejects.toThrow('NEXT_REDIRECT:/')
    })

    it('lists owned and shared lists once each, with item counts and owner names', async () => {
        await list('mine', 'guest')
        await list('theirs', 'owner')
        await wish('a', 'mine')
        await wish('b', 'mine')
        await fake.sadd('email:guest@x.io:invitedWishlists', 'theirs', 'mine')
        signInAs('guest', { name: 'Gus' })

        const props = propsOf(await WishlistsPage())
        const cards = props.initialWishlists as TProps[]
        expect(cards.map((c) => c.id).sort()).toEqual(['mine', 'theirs'])
        expect(cards.find((c) => c.id === 'mine')).toMatchObject({ itemCount: 2, ownerName: 'Gus' })
        expect(cards.find((c) => c.id === 'theirs')).toMatchObject({ itemCount: 0, ownerName: 'Olivia' })
        expect(props).toMatchObject({ userId: 'guest', userName: 'Gus' })
    })

    it('skips ids whose wishlist is gone', async () => {
        await fake.sadd('email:guest@x.io:invitedWishlists', 'ghost')
        signInAs('guest')
        expect(propsOf(await WishlistsPage()).initialWishlists).toEqual([])
    })
})

describe('history page', () => {
    it('redirects when signed out', async () => {
        signInAs(null)
        await expect(HistoryPage()).rejects.toThrow('NEXT_REDIRECT:/')
    })

    it('only includes lists whose event is over, flagged as history', async () => {
        await list('old', 'guest', { eventDate: PAST })
        await list('new', 'guest', { eventDate: FUTURE })
        signInAs('guest')

        const cards = propsOf(await HistoryPage()).initialWishlists as TProps[]
        expect(cards.map((c) => c.id)).toEqual(['old'])
        expect(cards[0].isHistory).toBe(true)
    })
})

describe('profile page', () => {
    it('redirects when signed out and renders when signed in', async () => {
        signInAs(null)
        await expect(ProfilePageRoute()).rejects.toThrow('NEXT_REDIRECT:/')
        signInAs('guest')
        expect(await ProfilePageRoute()).toBeTruthy()
    })
})

describe('public profile page', () => {
    const page = (id: string) => PublicProfileRoute({ params: Promise.resolve({ id }) })

    it('404s for unknown users and for private profiles', async () => {
        signInAs('guest')
        await expect(page('nobody')).rejects.toThrow('NEXT_NOT_FOUND')
        await expect(page('bob')).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('shows only the public wishlists of a public profile', async () => {
        await list('pub', 'owner')
        await list('priv', 'owner', { isPublic: false })
        await wish('w', 'pub')
        signInAs('guest')

        const props = propsOf(await page('owner'))
        const cards = props.wishlists as TProps[]
        expect(cards.map((c) => c.id)).toEqual(['pub'])
        expect(cards[0]).toMatchObject({ itemCount: 1, ownerName: 'Olivia' })
        expect(props).toMatchObject({ name: 'Olivia', currentUserId: 'guest' })
        expect(JSON.stringify(props)).not.toContain('@x.io')
    })

    it('works for anonymous visitors', async () => {
        signInAs(null)
        expect(propsOf(await page('owner')).currentUserId).toBe('')
    })
})
