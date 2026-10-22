import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { isValidEmailAddress, mailboxKey } from '@/shared/lib/emailAddress'
import { LockTimeoutError, busyResponse, withLock } from '@/shared/lib/kvLock'
import { getMailTransport, MailRejectedError, MailUnavailableError, renderInviteEmail, type TMail } from '@/shared/lib/mail'
import { hit, limitWrite, rateLimitResponse } from '@/shared/lib/rateLimit'

type TWishlistKV = {
    ownerId: string
    name: string
    description?: string
    eventDate: string
}

// Shorter than the invite lock's 10 s lifetime, so a hung send cannot outlive the lock.
const SEND_TIMEOUT_MS = 8000

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')

// Wishes the owner would count as theirs: suggestions from guests are not part of the recap.
const countWishes = async (wishlistId: string): Promise<number> => {
    const ids = (await kv.smembers<string[]>(`wishlist:${wishlistId}:wishes`)) ?? []
    if (ids.length === 0) return 0
    const wishes = await kv.mget<Array<{ status?: string } | null>>(...ids.map((id) => `wish:${id}`))
    return wishes.filter((wish) => wish && wish.status !== 'proposed').length
}

const sendWithTimeout = async (mail: TMail): Promise<void> => {
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

// POST /api/wishlist/share — email an invitation, then record the invitee. The email goes first:
// if it cannot be sent nothing is saved, so the owner can retry instead of leaving someone
// "invited" who was never told.
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const limited = await limitWrite(request, session.user.id, 'invite')
    if (limited) return limited

    try {
        const { wishlistId, email, locale } = await request.json()

        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }

        // The same address however it was typed: the invitee set, the index and the per-recipient
        // cap are all keyed by this form.
        const invitedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
        if (!isValidEmailAddress(invitedEmail)) {
            return NextResponse.json({ message: 'A valid email is required' }, { status: 400 })
        }

        const mailLocale = locale === 'en' ? 'en' : 'fr'

        // One invite at a time per list and address, so a double click sends one email, not two.
        // Its own lock: the wishlist lock is shared with pledges and edits, which must not wait
        // on an email.
        return await withLock(`invite:${wishlistId}:${invitedEmail}`, async () => {
            const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
            if (!wishlist) {
                return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
            }

            if (wishlist.ownerId !== session.user.id) {
                return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
            }

            if (await kv.sismember(`wishlist:${wishlistId}:invitees`, invitedEmail)) {
                return NextResponse.json({ ok: true, alreadyInvited: true })
            }

            const dailyCap = await hit('inviteDaily', session.user.id)
            if (!dailyCap.ok) return rateLimitResponse(dailyCap.retryAfter)

            // Keyed by the mailbox, not the typed string, so +tags and Gmail dots cannot dodge it.
            const recipientCap = await hit('inviteRecipient', mailboxKey(invitedEmail))
            if (!recipientCap.ok) return rateLimitResponse(recipientCap.retryAfter)

            const mail = renderInviteEmail({
                locale: mailLocale,
                to: invitedEmail,
                listName: wishlist.name,
                ownerName: session.user.name || session.user.email || '',
                eventDate: wishlist.eventDate,
                description: wishlist.description,
                wishCount: await countWishes(wishlistId),
                url: `${appUrl()}/${mailLocale}/wishlist/${wishlistId}`,
            })

            try {
                await sendWithTimeout(mail)
            } catch (err) {
                if (err instanceof MailRejectedError) {
                    return NextResponse.json({ message: 'Email address rejected', code: 'EMAIL_REJECTED' }, { status: 422 })
                }
                console.error('Invite email could not be sent:', err)
                return NextResponse.json({ message: 'Email service unavailable', code: 'EMAIL_UNAVAILABLE' }, { status: 503 })
            }

            // Record the invitee (sadd is idempotent) plus a reverse index so they see this
            // wishlist under "Shared with Me" as soon as they log in with this email. It is
            // keyed by email (not user id) since they may not have an account yet.
            await kv
                .multi()
                .sadd(`wishlist:${wishlistId}:invitees`, invitedEmail)
                .sadd(`email:${invitedEmail}:invitedWishlists`, wishlistId)
                .exec()

            console.info(`[share] Wishlist ${wishlistId} invite emailed`)

            return NextResponse.json({ ok: true, alreadyInvited: false })
        })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Share wishlist error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
