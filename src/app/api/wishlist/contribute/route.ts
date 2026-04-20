import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishlistKV = {
    id: string
    ownerId: string
    isPublic: boolean
    totalContributed?: number
    updatedAt: string
}

// POST /api/wishlist/contribute — add a monetary contribution to the wishlist pot
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { wishlistId, amount } = await request.json()
        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }
        const parsedAmount = Number(amount)
        if (!parsedAmount || parsedAmount <= 0) {
            return NextResponse.json({ message: 'amount must be a positive number' }, { status: 400 })
        }

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
        if (!wishlist) {
            return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
        }

        const pot = await kv.get(`wishlist:${wishlistId}:pot`)
        if (!pot) {
            return NextResponse.json({ message: 'No pot has been started for this wishlist' }, { status: 409 })
        }

        // Pot is a surprise — owner cannot contribute to their own pot
        if (wishlist.ownerId === session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        if (!wishlist.isPublic) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const now = new Date().toISOString()
        const contribution = { userId: session.user.id, amount: parsedAmount, contributedAt: now }

        await kv.lpush(`wishlist:${wishlistId}:contributions`, JSON.stringify(contribution))

        const newTotal = (wishlist.totalContributed ?? 0) + parsedAmount
        await kv.set(`wishlist:${wishlistId}`, { ...wishlist, totalContributed: newTotal, updatedAt: now })

        return NextResponse.json({ wishlistId, contribution, totalContributed: newTotal })
    } catch (error) {
        console.error('Contribute pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
