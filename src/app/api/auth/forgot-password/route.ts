import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'

import { isValidEmailAddress, mailboxKey } from '@/shared/lib/emailAddress'
import { appUrl, renderResetEmail, sendWithTimeout } from '@/shared/lib/mail'
import { issueResetToken } from '@/shared/lib/passwordReset'
import { clientIp, hit, rateLimitResponse } from '@/shared/lib/rateLimit'

type TUserKV = { email: string; password?: string }

// POST /api/auth/forgot-password — email a reset link. The answer is the same whether or not the
// account exists (or has a password at all), so the form cannot be used to find out who has one.
export async function POST(request: NextRequest) {
    const ip = await hit('passwordResetIp', clientIp(request.headers.get('x-forwarded-for')))
    if (!ip.ok) return rateLimitResponse(ip.retryAfter)

    try {
        const { email: rawEmail, locale } = await request.json()
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
        if (!isValidEmailAddress(email)) {
            return NextResponse.json({ message: 'Invalid email format' }, { status: 400 })
        }

        const mailbox = await hit('passwordResetEmail', mailboxKey(email))
        if (!mailbox.ok) return NextResponse.json({ ok: true })

        const user = await kv.get<TUserKV>(`user:${email}`)
        // Google accounts have no password to reset.
        if (user?.password) {
            const mailLocale = locale === 'en' ? 'en' : 'fr'
            const token = await issueResetToken(email)
            const url = `${appUrl()}/${mailLocale}/reset-password?token=${token}`
            try {
                await sendWithTimeout(renderResetEmail({ locale: mailLocale, to: email, url }))
            } catch (err) {
                // Do not tell the caller: a failure here would reveal that the account exists.
                console.error('Password reset email could not be sent:', err)
            }
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Forgot password error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
