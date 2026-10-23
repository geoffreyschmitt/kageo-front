import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'

import { LockTimeoutError, busyResponse, withLock } from '@/shared/lib/kvLock'
import { clearLoginFailures } from '@/shared/lib/loginThrottle'
import {
    hashResetToken,
    isWellFormedToken,
    resetTokenKey,
    resetUserKey,
} from '@/shared/lib/passwordReset'
import { clientIp, hit, rateLimitResponse } from '@/shared/lib/rateLimit'

type TUserKV = { email: string; password?: string }

const invalidLink = () =>
    NextResponse.json({ message: 'This link is invalid or has expired', code: 'INVALID_TOKEN' }, { status: 400 })

// POST /api/auth/reset-password — set a new password with the token from the email. A link works
// once: it is deleted together with the password change.
export async function POST(request: NextRequest) {
    const ip = clientIp(request.headers.get('x-forwarded-for'))
    const attempt = await hit('passwordResetAttempt', ip)
    if (!attempt.ok) return rateLimitResponse(attempt.retryAfter)

    try {
        const { token, password } = await request.json()

        if (typeof password !== 'string' || password.length < 6) {
            return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 })
        }
        if (!isWellFormedToken(token)) return invalidLink()

        const hash = hashResetToken(token)
        // Cheap early exit for guessed tokens, before the expensive password hash.
        if (!(await kv.get(resetTokenKey(hash)))) return invalidLink()
        const hashedPassword = await bcrypt.hash(password, 12)

        const outcome = await withLock(resetTokenKey(hash), async () => {
            const email = await kv.get<string>(resetTokenKey(hash))
            if (!email) return null
            const user = await kv.get<TUserKV>(`user:${email}`)
            if (!user?.password) return null

            await kv
                .multi()
                .set(`user:${email}`, { ...user, password: hashedPassword })
                .del(resetTokenKey(hash), resetUserKey(email))
                .exec()
            return email
        })

        if (!outcome) return invalidLink()

        // Whoever just proved they own the mailbox should not stay locked out by old failed tries.
        await clearLoginFailures(outcome, ip)

        return NextResponse.json({ ok: true })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Reset password error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
