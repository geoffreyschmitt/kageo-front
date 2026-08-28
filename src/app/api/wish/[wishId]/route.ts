import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'
import { parseContributions } from '@/app/api/wishlist/pot/readPot'
import { reconcileFundedStatus } from '@/app/api/wish/pot/reconcileFundedStatus'

type TWishKV = {
    id: string
    wishlistId: string
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: string
    status: 'wanted' | 'purchased' | 'reserved' | 'proposed' | 'funded'
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
        if (name.trim().length > 200) {
            return NextResponse.json({ message: 'Name must be 200 characters or fewer' }, { status: 400 })
        }
        if (description && description.length > 5000) {
            return NextResponse.json({ message: 'Description must be 5000 characters or fewer' }, { status: 400 })
        }
        if (notes && notes.length > 2000) {
            return NextResponse.json({ message: 'Notes must be 2000 characters or fewer' }, { status: 400 })
        }
        if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
            return NextResponse.json({ message: 'Price must be a non-negative number' }, { status: 400 })
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

        // The price IS the gift-pot goal, so editing it can push the pot over the
        // line or back below it. Only pay for the extra reads when a pot exists.
        const pot = await kv.get(`wish:${wishId}:pot`)
        if (pot) {
            const all = parseContributions(await kv.lrange<string>(`wish:${wishId}:contributions`, 0, -1))
            const byUser = new Map<string, number>()
            for (const c of all) byUser.set(c.userId, (byUser.get(c.userId) ?? 0) + c.amount)
            const total = Array.from(byUser.values()).filter((v) => v > 0).reduce((s, v) => s + v, 0)

            const next = reconcileFundedStatus(updated.status, total, updated.price)
            if (next) {
                const reconciled: TWishKV = { ...updated, status: next }
                await kv.set(`wish:${wishId}`, reconciled)
                return NextResponse.json(reconciled)
            }
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Edit wish error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
