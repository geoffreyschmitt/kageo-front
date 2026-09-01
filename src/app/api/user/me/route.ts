import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'

import { authOptions } from '@/shared/config/authOptions'

type KVUser = {
    id: string
    email: string
    name: string
    password: string
    provider: string
    createdAt: string
    isPublic?: boolean
    birthdate?: string
}

// Validates an ISO YYYY-MM-DD string that is a real date and not in the future.
function isValidBirthdate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime())) return false
    if (date.toISOString().slice(0, 10) !== value) return false
    return date.getTime() <= Date.now()
}

// GET /api/user/me — current user's profile
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const email = await kv.get<string>(`user:id:${session.user.id}`)
    if (!email) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const user = await kv.get<KVUser>(`user:${email}`)
    if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        isPublic: user.isPublic ?? false,
        birthdate: user.birthdate ?? null,
        hasPassword: Boolean(user.password),
    })
}

// PATCH /api/user/me — update name and/or public-profile preference
export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const email = await kv.get<string>(`user:id:${session.user.id}`)
    if (!email) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const user = await kv.get<KVUser>(`user:${email}`)
    if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { name, isPublic, birthdate } = body

        const updated: KVUser = { ...user }

        if (name !== undefined) {
            if (!name.trim()) {
                return NextResponse.json({ message: 'Name is required' }, { status: 400 })
            }
            updated.name = name.trim()
        }

        if (isPublic !== undefined) {
            updated.isPublic = Boolean(isPublic)
        }

        if (birthdate !== undefined) {
            if (birthdate === null || birthdate === '') {
                delete updated.birthdate
            } else if (typeof birthdate === 'string' && isValidBirthdate(birthdate)) {
                updated.birthdate = birthdate
            } else {
                return NextResponse.json({ message: 'Invalid birthdate' }, { status: 400 })
            }
        }

        await kv.set(`user:${email}`, updated)

        return NextResponse.json({
            id: updated.id,
            name: updated.name,
            email: updated.email,
            createdAt: updated.createdAt,
            isPublic: updated.isPublic ?? false,
            birthdate: updated.birthdate ?? null,
            hasPassword: Boolean(updated.password),
        })
    } catch (error) {
        console.error('Update profile error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/user/me — permanently delete the account and everything it owns
export async function DELETE() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const email = await kv.get<string>(`user:id:${userId}`)
    if (!email) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    try {
        const wishlistIds = (await kv.smembers<string[]>(`user:${userId}:wishlists`)) ?? []

        for (const wishlistId of wishlistIds) {
            const wishIds = (await kv.smembers<string[]>(`wishlist:${wishlistId}:wishes`)) ?? []
            for (const wishId of wishIds) {
                await kv.del(`wish:${wishId}`)
            }
            await kv.del(`wishlist:${wishlistId}:wishes`)
            await kv.del(`wishlist:${wishlistId}:pot`)
            await kv.del(`wishlist:${wishlistId}:contributions`)
            await kv.del(`wishlist:${wishlistId}:invitees`)
            await kv.del(`wishlist:${wishlistId}`)
        }

        await kv.del(`user:${userId}:wishlists`)
        await kv.del(`user:${email}`)
        await kv.del(`user:id:${userId}`)

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Delete account error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
