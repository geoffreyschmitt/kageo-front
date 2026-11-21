import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { LockTimeoutError, busyResponse, withLock, wishlistLock } from '@/shared/lib/kvLock'
import { limitWrite } from '@/shared/lib/rateLimit'
import { resolveOrder } from '@/shared/lib/wishOrder'

type TContext = { params: Promise<{ id: string }> }

// PUT /api/wishlist/[id]/order — save the owner's manual wish order
async function innerPUT(request: NextRequest, { params }: TContext) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const limited = await limitWrite(request, session.user.id, 'write')
    if (limited) return limited

    const { id } = await params
    const wishlist = await kv.get<{ ownerId: string }>(`wishlist:${id}`)
    if (!wishlist) {
        return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
    }
    if (wishlist.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await request.json().catch(() => null)
        const requested: unknown = body?.order
        if (!Array.isArray(requested) || !requested.every((entry) => typeof entry === 'string')) {
            return NextResponse.json({ message: 'order must be a list of wish ids' }, { status: 400 })
        }

        const wishIds = (await kv.smembers<string[]>(`wishlist:${id}:wishes`)) ?? []
        const currentOrder = await kv.get<string[]>(`wishlist:${id}:order`)
        const order = resolveOrder(requested, wishIds, currentOrder)
        if (!order) {
            return NextResponse.json({ message: 'Invalid order' }, { status: 400 })
        }

        await kv.set(`wishlist:${id}:order`, order)
        return NextResponse.json({ order })
    } catch (error) {
        console.error('Reorder wishes error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, context: TContext) {
    const { id } = await context.params
    try {
        return await withLock(wishlistLock(id), () => innerPUT(request, context))
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        throw error
    }
}
