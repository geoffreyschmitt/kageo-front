import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'

import { authOptions } from '@/shared/config/authOptions'

type KVUser = {
    id: string
    email: string
    name: string
    password: string
    provider: string
    createdAt: string
    isPublic?: boolean
}

// POST /api/user/password — change the current user's password
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { currentPassword, newPassword } = await request.json()

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ message: 'New password must be at least 6 characters' }, { status: 400 })
        }

        const email = await kv.get<string>(`user:id:${session.user.id}`)
        if (!email) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 })
        }

        const user = await kv.get<KVUser>(`user:${email}`)
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 })
        }

        if (!user.password) {
            return NextResponse.json(
                { message: 'This account signs in with Google and has no password to change' },
                { status: 400 },
            )
        }

        if (!currentPassword) {
            return NextResponse.json({ message: 'Current password is required' }, { status: 400 })
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password)
        if (!passwordMatch) {
            return NextResponse.json({ message: 'Current password is incorrect' }, { status: 403 })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12)
        await kv.set(`user:${email}`, { ...user, password: hashedPassword })

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
