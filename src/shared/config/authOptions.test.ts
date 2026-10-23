import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { authOptions } from './authOptions'

const signIn = (email: string, name = 'Gina') =>
    authOptions.callbacks!.signIn!({
        user: { id: '', email, name },
        account: { provider: 'google', type: 'oauth', providerAccountId: 'g1' },
    } as never)

beforeEach(() => {
    fake = createFakeKv()
})

describe('Google sign-in', () => {
    it('creates the account on first use and records when the terms were accepted', async () => {
        await signIn('Gina@X.io')
        const stored = (await fake.get('user:gina@x.io')) as { provider: string; termsAcceptedAt: string }
        expect(stored.provider).toBe('google')
        expect(Number.isNaN(Date.parse(stored.termsAcceptedAt))).toBe(false)
    })

    it('leaves an existing account untouched', async () => {
        const existing = { id: 'u1', email: 'gina@x.io', name: 'Old', password: '', provider: 'google', createdAt: 't' }
        await fake.set('user:gina@x.io', existing)
        await signIn('gina@x.io')
        expect(await fake.get('user:gina@x.io')).toEqual(existing)
    })
})
