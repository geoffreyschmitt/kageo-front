import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishKV = {
    id: string
    wishlistId: string
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: string
    status: string
    purchaseUrl: string
    notes: string
    createdAt: string
    updatedAt: string
}

type TWishlistKV = { ownerId: string }

// PUT /api/wish/[wishId] — edit a wish
export async function PUT(
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
    if (!wishlist || wishlist.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await request.json()
        const { name, description, price, currency, imageUrl, priority, purchaseUrl, notes } = body

        if (!name?.trim()) {
            return NextResponse.json({ message: 'Name is required' }, { status: 400 })
        }

        const updated: TWishKV = {
            ...wish,
            name: name.trim(),
            description: description?.trim() ?? '',
            price: Number(price) || 0,
            currency: currency ?? wish.currency,
            imageUrl: imageUrl ?? '',
            priority: priority ?? wish.priority,
            purchaseUrl: purchaseUrl ?? '',
            notes: notes?.trim() ?? '',
            updatedAt: new Date().toISOString(),
        }

        await kv.set(`wish:${wishId}`, updated)
        return NextResponse.json(updated)
    } catch (error) {
        console.error('Edit wish error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
