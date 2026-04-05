import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'

import { authOptions } from '@/shared/config/authOptions'

type TWishlistKV = {
    id: string
    ownerId: string
    allowSuggestions: boolean
    isPublic: boolean
}

// POST /api/wish — add a wish (or propose one) to a wishlist
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { wishlistId, name, description, price, currency, imageUrl, priority, purchaseUrl, notes, showToOwner } = body

        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }
        if (!name?.trim()) {
            return NextResponse.json({ message: 'Name is required' }, { status: 400 })
        }

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
        if (!wishlist) {
            return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
        }

        const isOwner = wishlist.ownerId === session.user.id
        const isProposed = !isOwner

        // Guests can only propose wishes when allowSuggestions is enabled
        if (isProposed && !wishlist.allowSuggestions) {
            return NextResponse.json({ message: 'Suggestions are not allowed for this wishlist' }, { status: 403 })
        }

        const id = uuidv4()
        const now = new Date().toISOString()

        const wish = {
            id,
            wishlistId,
            name: name.trim(),
            description: description?.trim() ?? '',
            price: Number(price) || 0,
            currency: currency ?? '€',
            imageUrl: imageUrl ?? '',
            priority: isProposed ? 'medium' : (priority ?? 'medium'),
            status: isProposed ? 'proposed' : 'wanted',
            purchaseUrl: purchaseUrl ?? '',
            notes: notes?.trim() ?? '',
            ...(isProposed ? { proposedBy: session.user.id, showToOwner: Boolean(showToOwner) } : {}),
            createdAt: now,
            updatedAt: now,
        }

        await kv.set(`wish:${id}`, wish)
        await kv.sadd(`wishlist:${wishlistId}:wishes`, id)

        return NextResponse.json(wish, { status: 201 })
    } catch (error) {
        console.error('Add wish error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
