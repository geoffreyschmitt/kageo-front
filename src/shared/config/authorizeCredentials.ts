import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'

import { RATE_LIMITED_ERROR } from '@/shared/config/rateLimits'
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from '@/shared/lib/loginThrottle'
import { clientIp } from '@/shared/lib/rateLimit'

type KVUser = {
    id: string
    email: string
    name: string
    password: string
}

export const authorizeCredentials = async (
    credentials: Record<'email' | 'password', string> | undefined,
    forwardedFor: string | null | undefined,
): Promise<{ id: string; email: string; name: string } | null> => {
    if (!credentials?.email || !credentials?.password) return null

    const ip = clientIp(forwardedFor)
    if (await isLoginBlocked(credentials.email, ip)) throw new Error(RATE_LIMITED_ERROR)

    const user = await kv.get<KVUser>(`user:${credentials.email.toLowerCase()}`)
    if (!user) {
        await recordLoginFailure(credentials.email, ip)
        return null
    }

    const passwordMatch = await bcrypt.compare(credentials.password, user.password)
    if (!passwordMatch) {
        await recordLoginFailure(credentials.email, ip)
        return null
    }

    await clearLoginFailures(credentials.email, ip)
    return { id: user.id, email: user.email, name: user.name }
}
