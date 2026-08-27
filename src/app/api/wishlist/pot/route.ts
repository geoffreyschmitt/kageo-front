import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { readPotForViewer } from './readPot'

type TWishlistKV = {
    id: string
    ownerId: string
    totalContributed?: number
}

type TPotKV = {
    creatorId: string
    creatorName: string
    createdAt: string
}

// GET /api/wishlist/pot?wishlistId={id}
// Returns a role-shaped payload (see readPot.ts):
//   - owner / no pot  → 404
//   - anyone else      → { creatorName, isCreator, totalContributed, myContribution, participantCount }
//   - pot creator      → + { creatorId, contributors: [{ name, amount, lastContributedAt }] }
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const wishlistId = searchParams.get('wishlistId')

    if (!wishlistId) {
        return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const pot = await readPotForViewer({ wishlistId, userId: session?.user?.id ?? null })

    if (!pot) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(pot)
}

// POST /api/wishlist/pot — create the pot
// Guards: logged-in, not owner, email in invitees, no pot exists yet
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { wishlistId } = await request.json()
        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
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

        const isInvited = await kv.sismember(`wishlist:${wishlistId}:invitees`, userEmail)
        if (!isInvited) {
            return NextResponse.json({ message: 'You must be invited to start a pot' }, { status: 403 })
        }

        const now = new Date().toISOString()
        const pot: TPotKV = {
            creatorId: session.user.id,
            creatorName: session.user.name ?? 'Someone',
            createdAt: now,
        }

        const wasSet = await kv.set(`wishlist:${wishlistId}:pot`, pot, { nx: true })
        if (!wasSet) {
            return NextResponse.json({ message: 'A pot already exists for this wishlist' }, { status: 409 })
        }

        return NextResponse.json(pot, { status: 201 })
    } catch (error) {
        console.error('Create pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
