import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { LockTimeoutError, busyResponse, safeBetsLock, withLock } from '@/shared/lib/kvLock'
import { limitWrite } from '@/shared/lib/rateLimit'
import { getSafeBets, safeBetsKey } from '@/shared/lib/safeBets'

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id
    const limited = await limitWrite(request, userId, 'write')
    if (limited) return limited

    try {
        const { ids } = (await request.json()) as { ids?: unknown }
        if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
            return NextResponse.json({ message: 'ids must be an array of strings' }, { status: 400 })
        }
        const wanted = ids as string[]

        return await withLock(safeBetsLock(userId), async () => {
            const entries = await getSafeBets(userId)
            const byId = new Map(entries.map((e) => [e.id, e]))
            const isPermutation =
                wanted.length === entries.length && new Set(wanted).size === wanted.length && wanted.every((id) => byId.has(id))
            if (!isPermutation) {
                return NextResponse.json({ message: 'ids must be a permutation of the current entries' }, { status: 400 })
            }

            const reordered = wanted.map((id) => byId.get(id)!)
            await kv.set(safeBetsKey(userId), reordered)

            return NextResponse.json(reordered)
        })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Reorder safe bets error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
