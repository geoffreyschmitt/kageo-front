import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import { mockSendConfirmationEmail } from '@/features/SendConfirmationEmail'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password, name } = body

        if (!email || !password || !name) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json({ message: 'Invalid email format' }, { status: 400 })
        }

        const existingUser = await kv.get(`user:${email.toLowerCase()}`)
        if (existingUser) {
            return NextResponse.json({ message: 'User already exists' }, { status: 409 })
        }

        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        const userId = uuidv4()
        const user = {
            id: userId,
            email: email.toLowerCase(),
            name,
            password: hashedPassword,
            provider: 'credentials',
            createdAt: new Date().toISOString(),
        }

        await kv.set(`user:${email.toLowerCase()}`, user)
        await kv.set(`user:id:${userId}`, email.toLowerCase())

        const confirmationToken = uuidv4()
        await kv.set(
            `confirmation:${confirmationToken}`,
            { userId, email: user.email, createdAt: new Date().toISOString() },
            { ex: 24 * 60 * 60 },
        )

        const { password: _password, ...userWithoutPassword } = user

        // Non-blocking email send after response
        if (process.env.USE_MOCK_EMAIL !== 'false') {
            mockSendConfirmationEmail(user.email, confirmationToken).catch((err) => {
                console.warn('Failed to send confirmation email:', err)
            })
        }

        return NextResponse.json(
            { message: 'User created successfully', user: userWithoutPassword },
            { status: 201 },
        )
    } catch (error) {
        console.error('Registration error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
