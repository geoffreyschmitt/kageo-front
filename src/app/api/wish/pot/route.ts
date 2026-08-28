import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { readGiftPotForViewer } from './readGiftPot'

type TWishKV = { id: string; wishlistId: string; price: number; status: string }
type TWishlistKV = { id: string; ownerId: string }
type TPotKV = { creatorId: string; creatorName: string; createdAt: string }

// GET /api/wish/pot?wishId={id} — role-shaped payload (see readGiftPot.ts)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const wishId = searchParams.get('wishId')
    if (!wishId) {
        return NextResponse.json({ message: 'wishId is required' }, { status: 400 })
    }
    const session = await getServerSession(authOptions)
    const pot = await readGiftPotForViewer({ wishId, userId: session?.user?.id ?? null })
    if (!pot) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(pot)
}

// POST /api/wish/pot — create the pot for a single wish
// Guards: logged in, wish + list exist, not the list owner, invited, price > 0,
// status is 'wanted', no pot yet.
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    try {
        const { wishId } = await request.json()
        if (!wishId) {
            return NextResponse.json({ message: 'wishId is required' }, { status: 400 })
        }

        const wish = await kv.get<TWishKV>(`wish:${wishId}`)
        if (!wish) {
            return NextResponse.json({ message: 'Wish not found' }, { status: 404 })
        }
        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
        if (!wishlist) {
            return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
        }
        if (wishlist.ownerId === session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const userEmail = session.user.email?.toLowerCase()
        if (!userEmail) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }
        const isInvited = await kv.sismember(`wishlist:${wish.wishlistId}:invitees`, userEmail)
        if (!isInvited) {
            return NextResponse.json({ message: 'You must be invited to start a pot' }, { status: 403 })
        }

        if (!(wish.price > 0)) {
            return NextResponse.json({ message: 'This wish has no price' }, { status: 422 })
        }
        if (wish.status !== 'wanted') {
            return NextResponse.json({ message: 'This wish is not available for a pot' }, { status: 409 })
        }

        const now = new Date().toISOString()
        const pot: TPotKV = {
            creatorId: session.user.id,
            creatorName: session.user.name ?? 'Someone',
            createdAt: now,
        }
        const wasSet = await kv.set(`wish:${wishId}:pot`, pot, { nx: true })
        if (!wasSet) {
            return NextResponse.json({ message: 'A pot already exists for this wish' }, { status: 409 })
        }
        return NextResponse.json(pot, { status: 201 })
    } catch (error) {
        console.error('Create gift pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
