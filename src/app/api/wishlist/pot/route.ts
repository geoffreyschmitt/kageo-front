import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type TWishlistKV = {
    id: string
    ownerId: string
    totalContributed?: number
}

type TPotKV = {
    creatorId: string
    creatorName: string
    createdAt: string
}

type TContribution = {
    userId: string
    amount: number
    contributedAt: string
}

type TUserKV = {
    id: string
    email: string
    name: string
}

// GET /api/wishlist/pot?wishlistId={id}
// Returns different payloads depending on who is calling:
//   - owner           → 404 (pot is a surprise)
//   - no session      → { creatorName, totalContributed }
//   - contributor     → { creatorName, totalContributed, myContribution }
//   - pot creator     → { creatorName, totalContributed, myContribution, contributors }
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const wishlistId = searchParams.get('wishlistId')

    if (!wishlistId) {
        return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
    }

    const [wishlist, pot] = await Promise.all([
        kv.get<TWishlistKV>(`wishlist:${wishlistId}`),
        kv.get<TPotKV>(`wishlist:${wishlistId}:pot`),
    ])

    if (!wishlist || !pot) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const session = await getServerSession(authOptions)

    // Hide pot from owner
    if (session?.user?.id && wishlist.ownerId === session.user.id) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const totalContributed = wishlist.totalContributed ?? 0

    // Non-logged-in: public view only
    if (!session?.user?.id) {
        return NextResponse.json({ creatorName: pot.creatorName, totalContributed })
    }

    // Fetch all contributions to compute per-user total
    const rawContributions = await kv.lrange<string>(`wishlist:${wishlistId}:contributions`, 0, -1)
    const contributions: TContribution[] = rawContributions.map(c =>
        typeof c === 'string' ? JSON.parse(c) : c
    )

    const myContribution = contributions
        .filter(c => c.userId === session.user.id)
        .reduce((sum, c) => sum + c.amount, 0)

    // Pot creator gets the full contributor list
    if (pot.creatorId === session.user.id) {
        // Group contributions by userId, fetch names
        const totalsById = new Map<string, number>()
        for (const c of contributions) {
            totalsById.set(c.userId, (totalsById.get(c.userId) ?? 0) + c.amount)
        }

        const contributors = await Promise.all(
            Array.from(totalsById.entries()).map(async ([userId, amount]) => {
                const email = await kv.get<string>(`user:id:${userId}`)
                if (!email) return { name: 'Anonymous', amount }
                const user = await kv.get<TUserKV>(`user:${email}`)
                return { name: user?.name ?? 'Anonymous', amount }
            })
        )

        return NextResponse.json({
            creatorId: pot.creatorId,
            creatorName: pot.creatorName,
            totalContributed,
            myContribution,
            contributors,
        })
    }

    return NextResponse.json({ creatorName: pot.creatorName, totalContributed, myContribution })
}

// POST /api/wishlist/pot — create the pot
// Guards: logged-in, not owner, email in invitees, no pot exists yet
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { wishlistId } = await request.json()
        if (!wishlistId) {
            return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
        }

        const wishlist = await kv.get<TWishlistKV>(`wishlist:${wishlistId}`)
        if (!wishlist) {
            return NextResponse.json({ message: 'Wishlist not found' }, { status: 404 })
        }

        if (wishlist.ownerId === session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const userEmail = session.user.email?.toLowerCase()
        if (!userEmail) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const isInvited = await kv.sismember(`wishlist:${wishlistId}:invitees`, userEmail)
        if (!isInvited) {
            return NextResponse.json({ message: 'You must be invited to start a pot' }, { status: 403 })
        }

        const now = new Date().toISOString()
        const pot: TPotKV = {
            creatorId: session.user.id,
            creatorName: session.user.name ?? 'Someone',
            createdAt: now,
        }

        const wasSet = await kv.set(`wishlist:${wishlistId}:pot`, pot, { nx: true })
        if (!wasSet) {
            return NextResponse.json({ message: 'A pot already exists for this wishlist' }, { status: 409 })
        }

        return NextResponse.json(pot, { status: 201 })
    } catch (error) {
        console.error('Create pot error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
