import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { SAFE_BET_LIMITS, validateSafeBetInput, type TSafeBet, type TSafeBetInput } from '@/entities/safeBet'

import { authOptions } from '@/shared/config/authOptions'
import { LockTimeoutError, busyResponse, safeBetsLock, withLock } from '@/shared/lib/kvLock'
import { limitWrite } from '@/shared/lib/rateLimit'
import { getSafeBets, safeBetsKey } from '@/shared/lib/safeBets'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        return NextResponse.json(await getSafeBets(session.user.id))
    } catch (error) {
        console.error('List safe bets error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id
    const limited = await limitWrite(request, userId, 'write')
    if (limited) return limited

    try {
        const body = (await request.json()) as TSafeBetInput
        const validation = validateSafeBetInput(body ?? ({} as TSafeBetInput))
        if (!validation.ok) {
            return NextResponse.json({ message: `Invalid ${validation.error}` }, { status: 400 })
        }

        return await withLock(safeBetsLock(userId), async () => {
            const entries = await getSafeBets(userId)
            if (entries.length >= SAFE_BET_LIMITS.maxEntries) {
                return NextResponse.json({ message: 'Too many entries' }, { status: 409 })
            }

            const entry: TSafeBet = {
                id: randomUUID(),
                ...validation.value,
                createdAt: new Date().toISOString(),
            }
            await kv.set(safeBetsKey(userId), [...entries, entry])

            return NextResponse.json(entry, { status: 201 })
        })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Create safe bet error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
