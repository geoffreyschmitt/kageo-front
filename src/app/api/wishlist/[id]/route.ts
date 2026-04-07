import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishlistKV = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage: string | null
    allowComments: boolean
    allowSuggestions: boolean
    notifyOnPurchase: boolean
    eventDate: string
    createdAt: string
    updatedAt: string
}

// GET /api/wishlist/[id] — get a wishlist with its wishes
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions)
    const { id } = await params

    const wishlist = await kv.get<TWishlistKV>(`wishlist:${id}`)
    if (!wishlist) {
        return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
    }

    // Only the owner can see private wishlists
    if (!wishlist.isPublic && wishlist.ownerId !== session?.user?.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const wishIds = await kv.smembers<string[]>(`wishlist:${id}:wishes`)
    const wishes = wishIds?.length
        ? (await Promise.all(wishIds.map((wid) => kv.get(`wish:${wid}`)))).filter(Boolean)
        : []

    return NextResponse.json({ ...wishlist, wishes })
}

// PUT /api/wishlist/[id] — update wishlist metadata
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const wishlist = await kv.get<TWishlistKV>(`wishlist:${id}`)

    if (!wishlist) {
        return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
    }
    if (wishlist.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await request.json()
        const { name, description, isPublic, coverImage, allowComments, allowSuggestions, notifyOnPurchase, eventDate } = body

        if (!name?.trim()) {
            return NextResponse.json({ message: 'Name is required' }, { status: 400 })
        }

        if (!eventDate) {
            return NextResponse.json({ message: 'Event date is required' }, { status: 400 })
        }

        const updated: TWishlistKV = {
            ...wishlist,
            name: name.trim(),
            description: description?.trim() ?? '',
            isPublic: Boolean(isPublic),
            coverImage: coverImage ?? null,
            allowComments: Boolean(allowComments),
            allowSuggestions: Boolean(allowSuggestions),
            notifyOnPurchase: Boolean(notifyOnPurchase),
            eventDate: new Date(eventDate).toISOString(),
            updatedAt: new Date().toISOString(),
        }

        await kv.set(`wishlist:${id}`, updated)
        return NextResponse.json(updated)
    } catch (error) {
        console.error('Update wishlist error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
