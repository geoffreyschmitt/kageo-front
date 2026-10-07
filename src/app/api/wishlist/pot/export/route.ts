import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { csvResponse, toCsv } from '@/shared/lib/toCsv'
import { readPotForViewer } from '../readPot'

// GET /api/wishlist/pot/export?wishlistId=… — pledges as CSV, pot organiser only.
// Reuses readPotForViewer so the "who may see names and amounts" rule stays in one place.
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const wishlistId = new URL(request.url).searchParams.get('wishlistId')
    if (!wishlistId) {
        return NextResponse.json({ message: 'wishlistId is required' }, { status: 400 })
    }

    const pot = await readPotForViewer({ wishlistId, userId: session.user.id })
    if (!pot) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    if (!pot.isCreator || !pot.contributors) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const rows = pot.contributors.map((c) => [c.name, c.amount, c.lastContributedAt ?? ''])
    return csvResponse(toCsv(['name', 'amount', 'pledged_at'], rows), `pledges-${wishlistId}.csv`)
}
