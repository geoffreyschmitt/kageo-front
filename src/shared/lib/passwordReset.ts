import { createHash, randomBytes } from 'crypto'

import { kv } from '@vercel/kv'

// Reset links. Only a hash of the token is stored, so a KV dump cannot be used to take over an
// account. One live link per account: asking again replaces the previous one.

export const RESET_TTL_SECONDS = 3600

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export const resetTokenKey = (hash: string) => `pwreset:${hash}`
export const resetUserKey = (email: string) => `pwreset:user:${email}`

export const hashResetToken = hashToken

// Looks like something we issued (url-safe base64 of 32 bytes); skips KV for obvious junk.
export const isWellFormedToken = (token: unknown): token is string =>
    typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)

export const issueResetToken = async (email: string): Promise<string> => {
    const token = randomBytes(32).toString('base64url')
    const hash = hashToken(token)
    const previous = await kv.get<string>(resetUserKey(email))

    const tx = kv.multi()
    if (previous) tx.del(resetTokenKey(previous))
    tx.set(resetTokenKey(hash), email, { ex: RESET_TTL_SECONDS })
    tx.set(resetUserKey(email), hash, { ex: RESET_TTL_SECONDS })
    await tx.exec()

    return token
}
