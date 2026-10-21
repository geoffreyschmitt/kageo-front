import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { authorizeCredentials } from './authorizeCredentials'
import { RATE_LIMITED_ERROR } from './rateLimits'

const ip = '1.2.3.4'
const login = (password: string, email = 'bob@x.io') => authorizeCredentials({ email, password }, ip)

beforeEach(async () => {
    fake = createFakeKv()
    await fake.set('user:bob@x.io', {
        id: 'u1',
        email: 'bob@x.io',
        name: 'Bob',
        password: await bcrypt.hash('secret1', 4),
    })
})

describe('authorizeCredentials', () => {
    it('returns the user for the correct password', async () => {
        expect(await login('secret1')).toEqual({ id: 'u1', email: 'bob@x.io', name: 'Bob' })
    })

    it('returns null without credentials', async () => {
        expect(await authorizeCredentials(undefined, ip)).toBeNull()
    })

    it('blocks after 10 wrong passwords, even with the correct one', async () => {
        for (let i = 0; i < 10; i++) expect(await login('wrong')).toBeNull()
        await expect(login('secret1')).rejects.toThrow(RATE_LIMITED_ERROR)
    })

    it('clears the counter on success', async () => {
        for (let i = 0; i < 3; i++) await login('wrong')
        expect(await login('secret1')).not.toBeNull()
        for (let i = 0; i < 9; i++) await login('wrong')
        expect(await login('secret1')).not.toBeNull()
    })

    it('counts an unknown email as a failure', async () => {
        expect(await login('x', 'ghost@x.io')).toBeNull()
        expect(fake.counter('ratelimit:loginFailures:ghost@x.io|1.2.3.4')).toBe(1)
    })
})
