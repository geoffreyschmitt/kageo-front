import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'

import { authOptions } from '@/shared/config/authOptions'

// GET /api/wishlist — list all wishlists belonging to the authenticated user
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const wishlistIds = await kv.smembers<string[]>(`user:${session.user.id}:wishlists`)
    if (!wishlistIds || wishlistIds.length === 0) {
        return NextResponse.json([])
    }

    const wishlists = await Promise.all(
        wishlistIds.map((id) => kv.get(`wishlist:${id}`)),
    )

    return NextResponse.json(wishlists.filter(Boolean))
}

// POST /api/wishlist — create a new wishlist
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, description, isPublic, coverImage, allowSuggestions, eventDate } = body

        if (!name?.trim()) {
            return NextResponse.json({ message: 'Name is required' }, { status: 400 })
        }

        if (!eventDate) {
            return NextResponse.json({ message: 'Event date is required' }, { status: 400 })
        }

        const id = uuidv4()
        const now = new Date().toISOString()

        const wishlist = {
            id,
            ownerId: session.user.id,
            name: name.trim(),
            description: description?.trim() ?? '',
            isPublic: Boolean(isPublic),
            coverImage: coverImage ?? null,
            allowSuggestions: Boolean(allowSuggestions),
            eventDate: new Date(eventDate).toISOString(),
            createdAt: now,
            updatedAt: now,
        }

        await kv.set(`wishlist:${id}`, wishlist)
        await kv.sadd(`user:${session.user.id}:wishlists`, id)

        return NextResponse.json(wishlist, { status: 201 })
    } catch (error) {
        console.error('Create wishlist error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
