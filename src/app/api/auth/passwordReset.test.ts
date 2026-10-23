import { NextRequest } from 'next/server'

import bcrypt from 'bcryptjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeKv, type TFakeKv } from '@/test/fakeKv'

let fake: TFakeKv
vi.mock('@vercel/kv', () => ({
    get kv() {
        return fake
    },
}))

import { getRule } from '@/shared/config/rateLimits'
import { MailUnavailableError, setMailTransportForTests, type TMail } from '@/shared/lib/mail'
import { hashResetToken, resetTokenKey, resetUserKey } from '@/shared/lib/passwordReset'

import { POST as forgot } from './forgot-password/route'
import { POST as reset } from './reset-password/route'

const post = (handler: (r: NextRequest) => Promise<Response>, body: unknown, ip = '1.1.1.1') =>
    handler(
        new NextRequest('http://localhost/api/auth/x', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
            body: JSON.stringify(body),
        }),
    )

let sent: TMail[]

const seedUser = (extra: Record<string, unknown> = {}) =>
    fake.set('user:ann@x.io', { id: 'u1', email: 'ann@x.io', name: 'Ann', password: 'old-hash', provider: 'credentials', ...extra })

const tokenFromMail = (mail: TMail) => /token=([A-Za-z0-9_-]{43})/.exec(mail.text)![1]

beforeEach(() => {
    fake = createFakeKv()
    sent = []
    setMailTransportForTests({ send: async (mail) => void sent.push(mail) })
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://kageo.test')
})

afterEach(() => {
    setMailTransportForTests(null)
    vi.unstubAllEnvs()
})

describe('POST /api/auth/forgot-password', () => {
    it('emails a one-hour link in the requested language and stores only a hash', async () => {
        await seedUser()
        const res = await post(forgot, { email: 'Ann@X.io', locale: 'en' })
        expect(res.status).toBe(200)
        expect(sent).toHaveLength(1)
        expect(sent[0].to).toBe('ann@x.io')
        expect(sent[0].subject).toBe('Reset your Kageo password')
        expect(sent[0].text).toContain('https://kageo.test/en/reset-password?token=')

        const token = tokenFromMail(sent[0])
        expect(await fake.get(resetTokenKey(hashResetToken(token)))).toBe('ann@x.io')
        expect(fake.keys().some((k) => k.includes(token))).toBe(false)
    })

    it('defaults to French', async () => {
        await seedUser()
        await post(forgot, { email: 'ann@x.io' })
        expect(sent[0].text).toContain('https://kageo.test/fr/reset-password?token=')
        expect(sent[0].subject).toContain('Réinitialisez')
    })

    it('answers the same and sends nothing for an unknown address or a Google account', async () => {
        await fake.set('user:g@x.io', { id: 'u2', email: 'g@x.io', name: 'G', password: '', provider: 'google' })
        const unknown = await post(forgot, { email: 'nobody@x.io' })
        const google = await post(forgot, { email: 'g@x.io' })
        expect(unknown.status).toBe(200)
        expect(google.status).toBe(200)
        expect(await unknown.json()).toEqual(await google.json())
        expect(sent).toHaveLength(0)
    })

    it('rejects a malformed address', async () => {
        expect((await post(forgot, { email: 'not-an-email' })).status).toBe(400)
        expect((await post(forgot, {})).status).toBe(400)
    })

    it('does not reveal a failed send, and a new request replaces the old link', async () => {
        await seedUser()
        setMailTransportForTests({
            send: async () => {
                throw new MailUnavailableError()
            },
        })
        vi.spyOn(console, 'error').mockImplementation(() => {})
        expect((await post(forgot, { email: 'ann@x.io' })).status).toBe(200)

        setMailTransportForTests({ send: async (mail) => void sent.push(mail) })
        await post(forgot, { email: 'ann@x.io' })
        await post(forgot, { email: 'ann@x.io' })
        const [first, second] = sent.map(tokenFromMail)
        expect(await fake.get(resetTokenKey(hashResetToken(first)))).toBeNull()
        expect(await fake.get(resetTokenKey(hashResetToken(second)))).toBe('ann@x.io')
    })

    it('limits mails per mailbox silently and requests per IP with a 429', async () => {
        await seedUser()
        const perMailbox = getRule('passwordResetEmail').limit
        for (let i = 0; i < perMailbox + 2; i++) {
            expect((await post(forgot, { email: 'ann+' + i + '@x.io' }, '2.2.2.2')).status).toBe(200)
        }
        const perIp = getRule('passwordResetIp').limit
        let last = 200
        for (let i = 0; i < perIp + 1; i++) last = (await post(forgot, { email: 'ann@x.io' }, '3.3.3.3')).status
        expect(last).toBe(429)
    })
})

describe('POST /api/auth/reset-password', () => {
    const issue = async () => {
        await seedUser()
        await post(forgot, { email: 'ann@x.io', locale: 'en' })
        return tokenFromMail(sent[0])
    }

    it('sets the new password once, and the link then stops working', async () => {
        const token = await issue()
        const res = await post(reset, { token, password: 'brand-new-1' })
        expect(res.status).toBe(200)

        const user = (await fake.get('user:ann@x.io')) as { password: string; name: string }
        expect(await bcrypt.compare('brand-new-1', user.password)).toBe(true)
        expect(user.name).toBe('Ann')
        expect(await fake.get(resetTokenKey(hashResetToken(token)))).toBeNull()
        expect(await fake.get(resetUserKey('ann@x.io'))).toBeNull()

        const again = await post(reset, { token, password: 'another-one-2' })
        expect(again.status).toBe(400)
        expect(await again.json()).toMatchObject({ code: 'INVALID_TOKEN' })
    })

    it('rejects unknown, malformed and missing tokens without touching the account', async () => {
        await seedUser()
        for (const token of ['x'.repeat(43), 'short', undefined, 42]) {
            const res = await post(reset, { token, password: 'brand-new-1' })
            expect(res.status).toBe(400)
            expect(await res.json()).toMatchObject({ code: 'INVALID_TOKEN' })
        }
        expect(((await fake.get('user:ann@x.io')) as { password: string }).password).toBe('old-hash')
    })

    it('refuses a short password and keeps the link usable', async () => {
        const token = await issue()
        expect((await post(reset, { token, password: '123' })).status).toBe(400)
        expect((await post(reset, { token, password: 'long-enough-1' })).status).toBe(200)
    })

    it('rejects an expired link (the stored token is gone)', async () => {
        const token = await issue()
        await fake.del(resetTokenKey(hashResetToken(token)))
        expect((await post(reset, { token, password: 'brand-new-1' })).status).toBe(400)
    })

    it('lets only one of two simultaneous uses win', async () => {
        const token = await issue()
        const [a, b] = await Promise.all([
            post(reset, { token, password: 'first-pass-1' }),
            post(reset, { token, password: 'second-pass-2' }),
        ])
        expect([a.status, b.status].sort()).toEqual([200, 400])
    })

    it('limits attempts per IP', async () => {
        const { limit } = getRule('passwordResetAttempt')
        let last = 0
        for (let i = 0; i <= limit; i++) last = (await post(reset, { token: 'x'.repeat(43), password: 'brand-new-1' }, '9.9.9.9')).status
        expect(last).toBe(429)
    })
})
