import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'

import { authOptions } from '@/shared/config/authOptions'
import { getWishlistAccess } from '@/shared/lib/wishlistAccess'
import type { TComment } from '@/entities/comment'

type TWishKV = { id: string; wishlistId: string }
type TWishlistKV = { id: string; ownerId: string; isPublic: boolean }

// GET /api/wish/[wishId]/comments — never exposed to the wish's wishlist owner
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ wishId: string }> },
) {
    const session = await getServerSession(authOptions)
    const { wishId } = await params

    const wish = await kv.get<TWishKV>(`wish:${wishId}`)
    if (!wish) {
        return NextResponse.json({ message: 'Wish not found' }, { status: 404 })
    }

    const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
    if (!wishlist) {
        return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
    }

    const { isOwner, canView } = await getWishlistAccess(wishlist, session?.user)
    if (isOwner || !canView) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const raw = (await kv.lrange<string>(`wish:${wishId}:comments`, 0, -1)) ?? []
    const comments: TComment[] = raw.map((c) => (typeof c === 'string' ? JSON.parse(c) : c))

    return NextResponse.json(comments)
}

// POST /api/wish/[wishId]/comments — add a comment; owner can never post or read these
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ wishId: string }> },
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { wishId } = await params
    const wish = await kv.get<TWishKV>(`wish:${wishId}`)
    if (!wish) {
        return NextResponse.json({ message: 'Wish not found' }, { status: 404 })
    }

    const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
    if (!wishlist) {
        return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
    }

    const { isOwner, canView } = await getWishlistAccess(wishlist, session.user)
    if (isOwner || !canView) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
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

        await kv.rpush(`wish:${wishId}:comments`, JSON.stringify(comment))

        return NextResponse.json(comment, { status: 201 })
    } catch (error) {
        console.error('Add wish comment error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
