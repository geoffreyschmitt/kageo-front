import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { csvResponse, toCsv } from '@/shared/lib/toCsv'
import { readGiftPotForViewer } from '../readGiftPot'

// GET /api/wish/pot/export?wishId=… — pledges as CSV, gift-pot organiser only.
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const wishId = new URL(request.url).searchParams.get('wishId')
    if (!wishId) {
        return NextResponse.json({ message: 'wishId is required' }, { status: 400 })
    }

    const pot = await readGiftPotForViewer({ wishId, userId: session.user.id })
    if (!pot) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    if (!pot.isCreator || !pot.contributors) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const rows = pot.contributors.map((c) => [c.name, c.amount, c.lastContributedAt ?? ''])
    return csvResponse(toCsv(['name', 'amount', 'pledged_at'], rows), `pledges-${wishId}.csv`)
}
