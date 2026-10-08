import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { LockTimeoutError, busyResponse, withLock, wishLock } from '@/shared/lib/kvLock'
import { getWishlistAccess } from '@/shared/lib/wishlistAccess'

type TWishKV = { id: string; status: string; wishlistId: string }
type TWishlistKV = { id?: string; isPublic: boolean; ownerId: string }

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

        return await withLock(wishLock(wishId), async () => {
            const wish = await kv.get<TWishKV>(`wish:${wishId}`)
            if (!wish) {
                return NextResponse.json({ message: 'Wish not found' }, { status: 404 })
            }

            const wishlist = await kv.get<TWishlistKV>(`wishlist:${wish.wishlistId}`)
            // Owner, anyone on a public list, or a guest invited to a private one.
            const access = wishlist
                ? await getWishlistAccess({ ...wishlist, id: wish.wishlistId }, session.user)
                : null
            if (!access?.canView) {
                return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
            }

            if (wish.status === 'purchased') {
                return NextResponse.json({ message: 'Wish is already purchased' }, { status: 409 })
            }

            // A funded gift pot: only its creator (the organiser) may close it out.
            if (wish.status === 'funded') {
                const pot = await kv.get<{ creatorId: string }>(`wish:${wishId}:pot`)
                if (!pot || pot.creatorId !== session.user.id) {
                    return NextResponse.json({ message: 'Only the pot organiser can do this' }, { status: 403 })
                }
            }

            const updated = { ...wish, status: 'purchased', purchasedBy: session.user.id, updatedAt: new Date().toISOString() }
            await kv.set(`wish:${wishId}`, updated)

            return NextResponse.json({ id: wishId, status: 'purchased', purchasedBy: session.user.id })
        })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Mark purchased error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
