import { getMailTransport, MailUnavailableError, type TMail } from './transport'

// Shorter than the 10 s lock lifetime of the routes that send, so a hung send cannot outlive its lock.
const SEND_TIMEOUT_MS = 8000

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')

export const sendWithTimeout = async (mail: TMail): Promise<void> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new MailUnavailableError('Mail send timed out')), SEND_TIMEOUT_MS)
    })
    try {
        await Promise.race([getMailTransport().send(mail), timeout])
    } finally {
        clearTimeout(timer)
    }
}
