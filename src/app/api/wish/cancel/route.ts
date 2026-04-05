import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishKV = { id: string; status: string; reservedBy?: string; wishlistId: string }

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { wishId } = await request.json()
        if (!wishId) {
            return NextResponse.json({ message: 'wishId is required' }, { status: 400 })
        }

        const wish = await kv.get<TWishKV>(`wish:${wishId}`)
        if (!wish) {
            return NextResponse.json({ message: 'Wish not found' }, { status: 404 })
        }

        if (wish.status !== 'reserved') {
            return NextResponse.json({ message: 'Wish is not reserved' }, { status: 409 })
        }

        // Only the person who reserved it can cancel
        if (wish.reservedBy !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const { reservedBy: _r, ...rest } = wish
        const updated = { ...rest, status: 'wanted', updatedAt: new Date().toISOString() }
        await kv.set(`wish:${wishId}`, updated)

        return NextResponse.json({ id: wishId, status: 'wanted', reservedBy: undefined })
    } catch (error) {
        console.error('Cancel reservation error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
