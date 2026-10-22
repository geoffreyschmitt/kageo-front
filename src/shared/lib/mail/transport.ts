import { Resend } from 'resend'

// Server-only: sends transactional mail. The transport is injectable so tests and the e2e run
// never reach a real inbox.

export type TMail = { to: string; subject: string; html: string; text: string }

export type TMailTransport = { send: (mail: TMail) => Promise<void> }

// The address was refused by the email service (malformed or not deliverable).
export class MailRejectedError extends Error {
    constructor(message = 'Mail rejected') {
        super(message)
        this.name = 'MailRejectedError'
    }
}

// The email service could not take the mail right now (down, rate limited, not configured).
export class MailUnavailableError extends Error {
    constructor(message = 'Mail service unavailable') {
        super(message)
        this.name = 'MailUnavailableError'
    }
}

type TResendClient = {
    emails: {
        send: (payload: { from: string; to: string; subject: string; html: string; text: string }) => Promise<unknown>
    }
}

// Resend answers with `{ data, error }` instead of throwing. Only `validation_error` means the
// request itself was refused; every other error, or a thrown network failure, is "unavailable".
export const createResendTransport = (client: TResendClient, from: string): TMailTransport => ({
    send: async (mail) => {
        let result: unknown
        try {
            result = await client.emails.send({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text })
        } catch (err) {
            throw new MailUnavailableError(err instanceof Error ? err.message : undefined)
        }
        const error = (result as { error?: { name?: string; message?: string } | null } | null)?.error
        if (!error) return
        if (error.name === 'validation_error') throw new MailRejectedError(error.message)
        throw new MailUnavailableError(error.message)
    },
})

const consoleTransport: TMailTransport = {
    send: async (mail) => {
        console.info(`[mail] to ${mail.to}: ${mail.subject}\n${mail.text}`)
    },
}

const unavailableTransport: TMailTransport = {
    send: async () => {
        throw new MailUnavailableError('RESEND_API_KEY is not set')
    },
}

let override: TMailTransport | null = null

export const setMailTransportForTests = (transport: TMailTransport | null): void => {
    override = transport
}

export const getMailTransport = (): TMailTransport => {
    if (override) return override

    const key = process.env.RESEND_API_KEY
    if (key) {
        const from = process.env.RESEND_FROM_EMAIL
        // A key without a sender cannot send; treat it like a missing configuration.
        if (!from) return unavailableTransport
        return createResendTransport(new Resend(key), from)
    }
    return process.env.NODE_ENV === 'production' ? unavailableTransport : consoleTransport
}
