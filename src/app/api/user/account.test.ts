import bcrypt from 'bcryptjs'
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

import { POST as register } from '../auth/register/route'

import { GET as exportData } from './export/route'
import { GET as getMe, PATCH as patchMe } from './me/route'
import { POST as changePassword } from './password/route'
import { GET as getStats } from './stats/route'

const seedUser = async (extra: Record<string, unknown> = {}) => {
    const user = {
        id: 'u1',
        email: 'u1@x.io',
        name: 'Una',
        password: await bcrypt.hash('secret1', 4),
        provider: 'credentials',
        createdAt: '2026-01-01T00:00:00.000Z',
        ...extra,
    }
    await fake.set('user:u1@x.io', user)
    await fake.set('user:id:u1', 'u1@x.io')
}

beforeEach(() => {
    fake = createFakeKv()
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/user/me', () => {
    it('401 when signed out', async () => {
        signInAs(null)
        expect((await getMe()).status).toBe(401)
    })

    it('404 when the session user has no record', async () => {
        signInAs('ghost')
        expect((await getMe()).status).toBe(404)
    })

    it('returns the profile without leaking the password hash', async () => {
        await seedUser()
        signInAs('u1')
        const body = await bodyOf(await getMe())
        expect(body).toMatchObject({ id: 'u1', name: 'Una', isPublic: false, birthdate: null, hasPassword: true })
        expect(body).not.toHaveProperty('password')
    })

    it('reports hasPassword false for a Google account', async () => {
        await seedUser({ password: '', provider: 'google' })
        signInAs('u1')
        expect(await bodyOf(await getMe())).toMatchObject({ hasPassword: false })
    })
})

describe('PATCH /api/user/me', () => {
    beforeEach(async () => {
        await seedUser()
        signInAs('u1')
    })

    it('401 when signed out', async () => {
        signInAs(null)
        expect((await patchMe(jsonRequest({ name: 'X' }, 'PATCH'))).status).toBe(401)
    })

    it('trims and saves the name, and toggles the public profile', async () => {
        const res = await patchMe(jsonRequest({ name: '  Nina  ', isPublic: true }, 'PATCH'))
        expect(res.status).toBe(200)
        expect(await bodyOf(res)).toMatchObject({ name: 'Nina', isPublic: true })
        expect(await fake.get('user:u1@x.io')).toMatchObject({ name: 'Nina', isPublic: true })
    })

    it('rejects a blank name', async () => {
        expect((await patchMe(jsonRequest({ name: '   ' }, 'PATCH'))).status).toBe(400)
        expect(await fake.get('user:u1@x.io')).toMatchObject({ name: 'Una' })
    })

    it('accepts a valid birthdate and clears it with null or an empty string', async () => {
        await patchMe(jsonRequest({ birthdate: '1990-05-17' }, 'PATCH'))
        expect(await fake.get('user:u1@x.io')).toMatchObject({ birthdate: '1990-05-17' })
        await patchMe(jsonRequest({ birthdate: null }, 'PATCH'))
        expect(await fake.get('user:u1@x.io')).not.toHaveProperty('birthdate')
        await patchMe(jsonRequest({ birthdate: '1990-05-17' }, 'PATCH'))
        await patchMe(jsonRequest({ birthdate: '' }, 'PATCH'))
        expect(await fake.get('user:u1@x.io')).not.toHaveProperty('birthdate')
    })

    it.each(['1990-02-30', '17/05/1990', '2999-01-01', 12345])('rejects invalid birthdate %s', async (birthdate) => {
        expect((await patchMe(jsonRequest({ birthdate }, 'PATCH'))).status).toBe(400)
    })

    it('never changes the email or password via the body', async () => {
        const before = (await fake.get('user:u1@x.io')) as { password: string }
        await patchMe(jsonRequest({ email: 'evil@x.io', password: 'x', id: 'u2' }, 'PATCH'))
        expect(await fake.get('user:u1@x.io')).toMatchObject({ id: 'u1', email: 'u1@x.io', password: before.password })
    })
})

describe('POST /api/user/password', () => {
    beforeEach(async () => {
        await seedUser()
        signInAs('u1')
    })

    it('401 when signed out', async () => {
        signInAs(null)
        expect((await changePassword(jsonRequest({ currentPassword: 'secret1', newPassword: 'newpass1' }))).status).toBe(401)
    })

    it('rejects a too-short new password', async () => {
        expect((await changePassword(jsonRequest({ currentPassword: 'secret1', newPassword: '123' }))).status).toBe(400)
    })

    it('requires the current password', async () => {
        expect((await changePassword(jsonRequest({ newPassword: 'newpass1' }))).status).toBe(400)
    })

    it('403 on a wrong current password and leaves the hash untouched', async () => {
        const before = (await fake.get('user:u1@x.io')) as { password: string }
        const res = await changePassword(jsonRequest({ currentPassword: 'nope', newPassword: 'newpass1' }))
        expect(res.status).toBe(403)
        expect(((await fake.get('user:u1@x.io')) as { password: string }).password).toBe(before.password)
    })

    it('changes the password when the current one matches', async () => {
        const res = await changePassword(jsonRequest({ currentPassword: 'secret1', newPassword: 'newpass1' }))
        expect(res.status).toBe(200)
        const saved = (await fake.get('user:u1@x.io')) as { password: string }
        expect(await bcrypt.compare('newpass1', saved.password)).toBe(true)
        expect(await bcrypt.compare('secret1', saved.password)).toBe(false)
    })

    it('refuses for a Google account that has no password', async () => {
        await seedUser({ password: '', provider: 'google' })
        expect((await changePassword(jsonRequest({ currentPassword: 'x', newPassword: 'newpass1' }))).status).toBe(400)
    })
})

describe('GET /api/user/export', () => {
    it('401 when signed out', async () => {
        signInAs(null)
        expect((await exportData()).status).toBe(401)
    })

    it('exports the profile and owned wishlists with wishes, and no password', async () => {
        await seedUser({ birthdate: '1990-05-17' })
        await fake.set('wishlist:L1', { id: 'L1', ownerId: 'u1', title: 'Mine' })
        await fake.set('wishlist:L2', { id: 'L2', ownerId: 'someone-else', title: 'Not mine' })
        await fake.sadd('user:u1:wishlists', 'L1', 'L2')
        await fake.sadd('wishlist:L1:wishes', 'w1')
        await fake.set('wish:w1', { id: 'w1', wishlistId: 'L1', title: 'Book' })
        signInAs('u1')

        const body = (await (await exportData()).json()) as {
            profile: Record<string, unknown>
            wishlists: { id: string; wishes: { id: string }[] }[]
        }
        expect(body.profile).toMatchObject({ id: 'u1', email: 'u1@x.io', birthdate: '1990-05-17' })
        expect(body.profile).not.toHaveProperty('password')
        expect(body.wishlists.map((w) => w.id)).toEqual(['L1'])
        expect(body.wishlists[0].wishes.map((w) => w.id)).toEqual(['w1'])
    })
})

describe('GET /api/user/stats', () => {
    it('401 when signed out', async () => {
        signInAs(null)
        expect((await getStats()).status).toBe(401)
    })

    it('counts owned wishlists, their wishes, and lists shared with the account email', async () => {
        await fake.set('wishlist:L1', { id: 'L1', ownerId: 'u1' })
        await fake.set('wishlist:L2', { id: 'L2', ownerId: 'u1' })
        await fake.sadd('user:u1:wishlists', 'L1', 'L2')
        await fake.sadd('wishlist:L1:wishes', 'a', 'b')
        await fake.sadd('wishlist:L2:wishes', 'c')
        await fake.sadd('email:u1@x.io:invitedWishlists', 'X1', 'X2', 'X3')
        signInAs('u1', { email: 'U1@X.io' })

        expect(await bodyOf(await getStats())).toEqual({ wishlists: 2, wishes: 3, shared: 3 })
    })

    it('returns zeros for a new account', async () => {
        signInAs('fresh')
        expect(await bodyOf(await getStats())).toEqual({ wishlists: 0, wishes: 0, shared: 0 })
    })
})

describe('POST /api/auth/register', () => {
    const valid = { email: 'New@X.io', password: 'secret1', name: 'New' }

    it.each([
        [{ ...valid, email: '' }, 'missing email'],
        [{ ...valid, name: '' }, 'missing name'],
        [{ ...valid, password: '12345' }, 'short password'],
        [{ ...valid, email: 'not-an-email' }, 'bad email'],
    ])('400 on %j (%s)', async (body) => {
        expect((await register(jsonRequest(body))).status).toBe(400)
        expect(fake.keys()).toEqual([])
    })

    it('creates a lowercased user with a hashed password and an id index', async () => {
        const res = await register(jsonRequest(valid))
        expect(res.status).toBe(201)
        const body = (await res.json()) as { user: Record<string, string> }
        expect(body.user).toMatchObject({ email: 'new@x.io', name: 'New', provider: 'credentials' })
        expect(body.user).not.toHaveProperty('password')

        const stored = (await fake.get('user:new@x.io')) as { password: string; id: string }
        expect(stored.password).not.toBe('secret1')
        expect(await bcrypt.compare('secret1', stored.password)).toBe(true)
        expect(await fake.get(`user:id:${stored.id}`)).toBe('new@x.io')
    })

    it('409 when the email already exists, case-insensitively', async () => {
        await register(jsonRequest(valid))
        expect((await register(jsonRequest({ ...valid, email: 'NEW@x.io' }))).status).toBe(409)
    })
})
