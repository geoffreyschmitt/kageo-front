import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    createResendTransport,
    getMailTransport,
    MailRejectedError,
    MailUnavailableError,
    setMailTransportForTests,
    type TMail,
} from './transport'

const mail: TMail = { to: 'friend@x.io', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' }

const clientReturning = (result: unknown) => ({ emails: { send: vi.fn(async () => result) } })

afterEach(() => {
    setMailTransportForTests(null)
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

describe('createResendTransport', () => {
    it('sends the mail from the configured sender', async () => {
        const client = clientReturning({ data: { id: '1' }, error: null })
        await createResendTransport(client, 'Kageo <invites@x.io>').send(mail)

        expect(client.emails.send).toHaveBeenCalledWith({
            from: 'Kageo <invites@x.io>',
            to: 'friend@x.io',
            subject: 'Hi',
            html: '<p>Hi</p>',
            text: 'Hi',
        })
    })

    it('maps a Resend validation_error to MailRejectedError', async () => {
        const client = clientReturning({ data: null, error: { name: 'validation_error', message: 'bad', statusCode: 422 } })
        await expect(createResendTransport(client, 'a@b.co').send(mail)).rejects.toBeInstanceOf(MailRejectedError)
    })

    it.each(['rate_limit_exceeded', 'invalid_api_key', 'daily_quota_exceeded', 'internal_server_error'])(
        'maps the Resend error %s to MailUnavailableError',
        async (name) => {
            const client = clientReturning({ data: null, error: { name, message: 'x', statusCode: 500 } })
            await expect(createResendTransport(client, 'a@b.co').send(mail)).rejects.toBeInstanceOf(MailUnavailableError)
        },
    )

    it('maps a thrown network error to MailUnavailableError', async () => {
        const client = { emails: { send: vi.fn(async () => { throw new Error('ECONNRESET') }) } }
        await expect(createResendTransport(client, 'a@b.co').send(mail)).rejects.toBeInstanceOf(MailUnavailableError)
    })
})

describe('getMailTransport', () => {
    it('logs instead of sending when there is no key outside production', async () => {
        vi.stubEnv('RESEND_API_KEY', '')
        vi.stubEnv('NODE_ENV', 'development')
        const info = vi.spyOn(console, 'info').mockImplementation(() => {})

        await expect(getMailTransport().send(mail)).resolves.toBeUndefined()
        expect(info).toHaveBeenCalledTimes(1)
        expect(String(info.mock.calls[0]?.[0])).toContain('friend@x.io')
    })

    it('refuses to send in production without a key', async () => {
        vi.stubEnv('RESEND_API_KEY', '')
        vi.stubEnv('NODE_ENV', 'production')

        await expect(getMailTransport().send(mail)).rejects.toBeInstanceOf(MailUnavailableError)
    })

    it('uses the injected transport when one is set', async () => {
        const send = vi.fn(async () => {})
        setMailTransportForTests({ send })

        await getMailTransport().send(mail)
        expect(send).toHaveBeenCalledWith(mail)
    })
})
