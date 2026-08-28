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
    allowSuggestions: boolean
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

    // Only the owner and invited guests can see private wishlists
    if (!wishlist.isPublic && wishlist.ownerId !== session?.user?.id) {
        const isInvited = session?.user?.email
            ? Boolean(await kv.sismember(`wishlist:${id}:invitees`, session.user.email.toLowerCase()))
            : false

        if (!isInvited) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }
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
        const { name, description, isPublic, coverImage, allowSuggestions, eventDate } = body

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
            allowSuggestions: Boolean(allowSuggestions),
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

type TWishKV = { id: string; status: 'wanted' | 'purchased' | 'reserved' | 'proposed' | 'funded' }

// DELETE /api/wishlist/[id] — permanently delete a wishlist
// Only allowed for the owner, and only if nothing has happened on it yet:
// no reserved/purchased/proposed wishes, no wishlist pot, no per-wish gift pot,
// no comments.
export async function DELETE(
    _request: NextRequest,
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
        const wishIds = (await kv.smembers<string[]>(`wishlist:${id}:wishes`)) ?? []
        const wishes = wishIds.length
            ? (await Promise.all(wishIds.map((wid) => kv.get<TWishKV>(`wish:${wid}`)))).filter(Boolean) as TWishKV[]
            : []

        const hasWishActivity = wishes.some((w) => w.status !== 'wanted')
        const pot = await kv.get(`wishlist:${id}:pot`)
        // A gift pot lives per wish, so a wishlist can hold real pledges while every
        // wish still reads 'wanted'. Deleting then would silently destroy them.
        const anyGiftPot = (await Promise.all(wishIds.map((wid) => kv.get(`wish:${wid}:pot`)))).some(Boolean)
        const comments = (await kv.lrange<string>(`wishlist:${id}:comments`, 0, -1)) ?? []

        if (hasWishActivity || pot || anyGiftPot || comments.length > 0) {
            return NextResponse.json(
                { message: 'This wishlist has activity and can no longer be deleted' },
                { status: 409 },
            )
        }

        // Drop each wish with its gift-pot side keys so nothing is orphaned.
        await Promise.all(
            wishIds.flatMap((wid) => [
                kv.del(`wish:${wid}`),
                kv.del(`wish:${wid}:pot`),
                kv.del(`wish:${wid}:contributions`),
            ]),
        )

        const invitees = (await kv.smembers<string[]>(`wishlist:${id}:invitees`)) ?? []
        await Promise.all(invitees.map((email) => kv.srem(`email:${email}:invitedWishlists`, id)))

        await Promise.all([
            kv.del(`wishlist:${id}:wishes`),
            kv.del(`wishlist:${id}:invitees`),
            kv.del(`wishlist:${id}:contributions`),
            kv.del(`wishlist:${id}:comments`),
            kv.srem(`user:${session.user.id}:wishlists`, id),
        ])

        await kv.del(`wishlist:${id}`)

        return NextResponse.json({ id, deleted: true })
    } catch (error) {
        console.error('Delete wishlist error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
