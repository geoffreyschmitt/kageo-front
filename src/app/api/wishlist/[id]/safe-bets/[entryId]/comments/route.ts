import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'
import { v4 as uuidv4 } from 'uuid'

import type { TComment } from '@/entities/comment'

import { authOptions } from '@/shared/config/authOptions'
import { limitWrite } from '@/shared/lib/rateLimit'
import { getSafeBets, safeBetCommentsKey } from '@/shared/lib/safeBets'
import { getWishlistAccess, notInvitedResponse } from '@/shared/lib/wishlistAccess'

type TWishlistKV = { id: string; ownerId: string; isPublic: boolean }
type TParams = { params: Promise<{ id: string; entryId: string }> }

// GET /api/wishlist/[id]/safe-bets/[entryId]/comments — never exposed to the wishlist owner
export async function GET(_request: NextRequest, { params }: TParams) {
    const session = await getServerSession(authOptions)
    const { id, entryId } = await params

    const wishlist = await kv.get<TWishlistKV>(`wishlist:${id}`)
    if (!wishlist) {
        return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
    }

    const { isOwner, canAct } = await getWishlistAccess(wishlist, session?.user)
    if (isOwner) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    if (!canAct) {
        return notInvitedResponse()
    }

    const entries = await getSafeBets(wishlist.ownerId)
    if (!entries.some((e) => e.id === entryId)) {
        return NextResponse.json({ message: 'Safe bet not found' }, { status: 404 })
    }

    const raw = (await kv.lrange<string>(safeBetCommentsKey(entryId), 0, -1)) ?? []
    const comments: TComment[] = raw.map((c) => (typeof c === 'string' ? JSON.parse(c) : c))

    return NextResponse.json(comments)
}

// POST /api/wishlist/[id]/safe-bets/[entryId]/comments — add a comment; owner can never post or read these
export async function POST(request: NextRequest, { params }: TParams) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const limited = await limitWrite(request, session.user.id, 'comment')
    if (limited) return limited

    const { id, entryId } = await params
    const wishlist = await kv.get<TWishlistKV>(`wishlist:${id}`)
    if (!wishlist) {
        return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
    }

    const { isOwner, canAct } = await getWishlistAccess(wishlist, session.user)
    if (isOwner) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    if (!canAct) {
        return notInvitedResponse()
    }

    const entries = await getSafeBets(wishlist.ownerId)
    if (!entries.some((e) => e.id === entryId)) {
        return NextResponse.json({ message: 'Safe bet not found' }, { status: 404 })
    }

    try {
        const { text } = await request.json()
        if (!text?.trim()) {
            return NextResponse.json({ message: 'Comment text is required' }, { status: 400 })
        }

        const comment: TComment = {
            id: uuidv4(),
            authorId: session.user.id,
            authorName: session.user.name ?? 'Someone',
            text: text.trim().slice(0, 2000),
            createdAt: new Date().toISOString(),
        }

        await kv.rpush(safeBetCommentsKey(entryId), JSON.stringify(comment))

        return NextResponse.json(comment, { status: 201 })
    } catch (error) {
        console.error('Add safe bet comment error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
