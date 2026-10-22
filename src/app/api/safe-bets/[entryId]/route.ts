import { NextRequest, NextResponse } from 'next/server'

import { kv } from '@vercel/kv'
import { getServerSession } from 'next-auth'

import { validateSafeBetInput, type TSafeBet, type TSafeBetInput } from '@/entities/safeBet'

import { authOptions } from '@/shared/config/authOptions'
import { safeBetKeys } from '@/shared/lib/kvCascade'
import { LockTimeoutError, busyResponse, safeBetsLock, withLock } from '@/shared/lib/kvLock'
import { limitWrite } from '@/shared/lib/rateLimit'
import { getSafeBets, safeBetsKey } from '@/shared/lib/safeBets'

type TParams = { params: Promise<{ entryId: string }> }

export async function PATCH(request: NextRequest, { params }: TParams) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id
    const limited = await limitWrite(request, userId, 'write')
    if (limited) return limited

    try {
        const { entryId } = await params
        const body = (await request.json()) as TSafeBetInput
        const validation = validateSafeBetInput(body ?? ({} as TSafeBetInput))
        if (!validation.ok) {
            return NextResponse.json({ message: `Invalid ${validation.error}` }, { status: 400 })
        }

        return await withLock(safeBetsLock(userId), async () => {
            const entries = await getSafeBets(userId)
            const current = entries.find((e) => e.id === entryId)
            if (!current) {
                return NextResponse.json({ message: 'Entry not found' }, { status: 404 })
            }

            const updated: TSafeBet = { id: current.id, createdAt: current.createdAt, ...validation.value }
            await kv.set(
                safeBetsKey(userId),
                entries.map((e) => (e.id === entryId ? updated : e)),
            )

            return NextResponse.json(updated)
        })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Update safe bet error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: TParams) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id
    const limited = await limitWrite(request, userId, 'write')
    if (limited) return limited

    try {
        const { entryId } = await params

        return await withLock(safeBetsLock(userId), async () => {
            const entries = await getSafeBets(userId)
            if (!entries.some((e) => e.id === entryId)) {
                return NextResponse.json({ message: 'Entry not found' }, { status: 404 })
            }

            await kv
                .multi()
                .set(
                    safeBetsKey(userId),
                    entries.filter((e) => e.id !== entryId),
                )
                .del(...safeBetKeys(entryId))
                .exec()

            return NextResponse.json({ ok: true })
        })
    } catch (error) {
        if (error instanceof LockTimeoutError) return busyResponse()
        console.error('Delete safe bet error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
