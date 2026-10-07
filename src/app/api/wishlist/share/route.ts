import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'

// POST /api/wishlist/share — invite a user by email and record them as an invitee
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { wishlistId, email } = await request.json()

        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json({ message: 'A valid email is required' }, { status: 400 })
        }

        const wishlist = await kv.get<{ ownerId: string }>(`wishlist:${wishlistId}`)
        if (!wishlist) {
            return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
        }

        if (wishlist.ownerId !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const invitedEmail = email.toLowerCase()
        // Record the invitee (sadd is idempotent) plus a reverse index so they see this
        // wishlist under "Shared with Me" as soon as they log in with this email. It is
        // keyed by email (not user id) since they may not have an account yet.
        await kv
            .multi()
            .sadd(`wishlist:${wishlistId}:invitees`, invitedEmail)
            .sadd(`email:${invitedEmail}:invitedWishlists`, wishlistId)
            .exec()

        console.info(`[share] Wishlist ${wishlistId} invite sent to ${email}`)

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Share wishlist error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
