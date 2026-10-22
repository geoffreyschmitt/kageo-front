import { NextRequest } from 'next/server'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'
import { bodyOf, jsonRequest, signInAs } from '@/test/route'

import { MailRejectedError, MailUnavailableError, setMailTransportForTests, type TMail } from '@/shared/lib/mail'

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

    it('GET shows a private list to anyone with the link, signed in or not', async () => {
        signInAs(null)
        const anonymous = await getOne(plain, params('L'))
        expect(anonymous.status).toBe(200)
        expect((await bodyOf(anonymous)).wishes as unknown[]).toHaveLength(1)
        signInAs('stranger')
        expect((await getOne(plain, params('L'))).status).toBe(200)
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
    let sent: TMail[]

    const seedList = async (id: string, ownerId = 'owner', extra: Record<string, unknown> = {}) => {
        await fake.set(`wishlist:${id}`, {
            id, ownerId, name: `List ${id}`, description: 'Come celebrate', eventDate: '2026-12-24', isPublic: false, ...extra,
        })
    }

    beforeEach(async () => {
        fake = createFakeKv()
        sent = []
        setMailTransportForTests({ send: async (mail) => { sent.push(mail) } })
        vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://kageo.test')
        await seedList('L')
        await fake.sadd('wishlist:L:wishes', 'a', 'b', 'c')
        await fake.set('wish:a', { id: 'a', status: 'wanted' })
        await fake.set('wish:b', { id: 'b', status: 'reserved', reservedBy: 'secretguest' })
        await fake.set('wish:c', { id: 'c', status: 'proposed' })
        await fake.set('wishlist:L:pot', { creatorId: 'x', creatorName: 'SecretPotter' })
    })

    afterEach(() => {
        setMailTransportForTests(null)
        vi.unstubAllEnvs()
    })

    it('is owner-only and validates the email', async () => {
        signInAs('stranger')
        expect((await share(jsonRequest({ wishlistId: 'L', email: 'a@b.co' }))).status).toBe(403)
        signInAs('owner')
        expect((await share(jsonRequest({ wishlistId: 'L', email: 'not-an-email' }))).status).toBe(400)
        expect((await share(jsonRequest({ email: 'a@b.co' }))).status).toBe(400)
        expect((await share(jsonRequest({ wishlistId: 'nope', email: 'a@b.co' }))).status).toBe(404)
        expect(sent).toHaveLength(0)
    })

    it('sends one email with the subject, the link and the recap, then records the invitee', async () => {
        signInAs('owner', { name: 'Olivia' })
        const res = await share(jsonRequest({ wishlistId: 'L', email: 'friend@x.io', locale: 'en' }))

        expect(res.status).toBe(200)
        expect(await bodyOf(res)).toEqual({ ok: true, alreadyInvited: false })
        expect(sent).toHaveLength(1)
        expect(sent[0]).toMatchObject({ to: 'friend@x.io', subject: "You've been invited to a wishlist on Kageo: List L" })
        expect(sent[0].html).toContain('href="https://kageo.test/en/wishlist/L"')
        expect(sent[0].html).toContain('Olivia invited you to a wishlist')
        expect(sent[0].html).toContain('2 wishes')
        expect(fake.members('wishlist:L:invitees')).toEqual(['friend@x.io'])
        expect(fake.members('email:friend@x.io:invitedWishlists')).toEqual(['L'])
    })

    it('never puts reservation or pot data in the email', async () => {
        signInAs('owner')
        await share(jsonRequest({ wishlistId: 'L', email: 'friend@x.io', locale: 'en' }))

        for (const part of [sent[0].html, sent[0].text, sent[0].subject]) {
            expect(part).not.toContain('secretguest')
            expect(part).not.toContain('SecretPotter')
        }
    })

    it('treats " Friend@X.io " as friend@x.io for the invitee and the recipient', async () => {
        signInAs('owner')
        expect((await share(jsonRequest({ wishlistId: 'L', email: ' Friend@X.io ' }))).status).toBe(200)

        expect(sent[0].to).toBe('friend@x.io')
        expect(fake.members('wishlist:L:invitees')).toEqual(['friend@x.io'])
        expect(fake.members('email:friend@x.io:invitedWishlists')).toEqual(['L'])
    })

    it('answers alreadyInvited and sends no second email', async () => {
        signInAs('owner')
        await share(jsonRequest({ wishlistId: 'L', email: 'Friend@X.io' }))
        const again = await share(jsonRequest({ wishlistId: 'L', email: 'friend@x.io' }))

        expect(again.status).toBe(200)
        expect(await bodyOf(again)).toEqual({ ok: true, alreadyInvited: true })
        expect(sent).toHaveLength(1)
    })

    it('saves nothing and answers 422 EMAIL_REJECTED when the address is refused', async () => {
        setMailTransportForTests({ send: async () => { throw new MailRejectedError() } })
        signInAs('owner')
        const res = await share(jsonRequest({ wishlistId: 'L', email: 'friend@x.io' }))

        expect(res.status).toBe(422)
        expect(await bodyOf(res)).toMatchObject({ code: 'EMAIL_REJECTED' })
        expect(fake.members('wishlist:L:invitees')).toEqual([])
        expect(fake.members('email:friend@x.io:invitedWishlists')).toEqual([])
    })

    it('saves nothing and answers 503 EMAIL_UNAVAILABLE when the service is down', async () => {
        setMailTransportForTests({ send: async () => { throw new MailUnavailableError() } })
        signInAs('owner')
        const res = await share(jsonRequest({ wishlistId: 'L', email: 'friend@x.io' }))

        expect(res.status).toBe(503)
        expect(await bodyOf(res)).toMatchObject({ code: 'EMAIL_UNAVAILABLE' })
        expect(fake.members('wishlist:L:invitees')).toEqual([])
    })

    it('stops after 10 invite emails to one address in a day, across owners and letter case', async () => {
        for (let i = 0; i < 11; i++) {
            await seedList(`C${i}`, `o${i % 2}`)
            signInAs(`o${i % 2}`)
            const res = await share(jsonRequest({ wishlistId: `C${i}`, email: i % 2 ? 'Pat@X.io' : 'pat@x.io' }))
            expect(res.status).toBe(i < 10 ? 200 : 429)
        }
        expect(sent).toHaveLength(10)
        expect(fake.members('wishlist:C10:invitees')).toEqual([])
    })

    it('sends exactly one email when the same address is invited twice at once', async () => {
        setMailTransportForTests({
            send: async (mail) => {
                await new Promise((resolve) => setTimeout(resolve, 30))
                sent.push(mail)
            },
        })
        signInAs('owner')
        const [a, b] = await Promise.all([
            share(jsonRequest({ wishlistId: 'L', email: 'friend@x.io' })),
            share(jsonRequest({ wishlistId: 'L', email: 'friend@x.io' })),
        ])

        expect(sent).toHaveLength(1)
        expect([a.status, b.status]).toEqual([200, 200])
        const bodies = [await bodyOf(a), await bodyOf(b)]
        expect(bodies.filter((body) => body.alreadyInvited === true)).toHaveLength(1)
    })

    it.each([
        ['en', 'en'],
        ['fr', 'fr'],
        ['de', 'fr'],
        [undefined, 'fr'],
    ])('locale %s gives a %s email', async (locale, expected) => {
        signInAs('owner')
        await share(jsonRequest({ wishlistId: 'L', email: 'friend@x.io', locale }))

        expect(sent[0].html).toContain(`href="https://kageo.test/${expected}/wishlist/L"`)
        expect(sent[0].subject.startsWith(expected === 'en' ? "You've been invited" : 'Vous êtes invité')).toBe(true)
    })
})
