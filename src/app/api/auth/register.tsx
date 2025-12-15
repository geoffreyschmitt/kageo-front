import type { NextApiRequest, NextApiResponse } from 'next'

import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import { mockSendConfirmationEmail } from '@/features/SendConfirmationEmail'


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        const { email, password, name } = req.body

        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Missing required fields' })
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' })
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' })
        }

        // Check if user already exists
        const existingUser = await kv.get(`user:${email}`)
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' })
        }

        // Hash password
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Create user
        const userId = uuidv4()
        const user = {
            id: userId,
            email: email.toLowerCase(),
            name,
            password: hashedPassword,
            provider: 'credentials',
            createdAt: new Date().toISOString(),
        }

        // Store user in Vercel KV
        await kv.set(`user:${email}`, user)
        await kv.set(`user:id:${userId}`, email) // For reverse lookup

        // Generate confirmation token for email verification
        const confirmationToken = uuidv4()

        // Store confirmation token (for future email verification endpoint)
        await kv.set(`confirmation:${confirmationToken}`, {
            userId,
            email: user.email,
            createdAt: new Date().toISOString(),
        }, { ex: 24 * 60 * 60 }) // Expire after 24 hours

        // Return success (don't return password)
        const { password: {}, ...userWithoutPassword } = user

        res.status(201).json({
            message: 'User created successfully',
            user: userWithoutPassword
        })

        // Send confirmation email (non-blocking, optional)
        // This runs after the response is sent, so it won't delay user registration
        // Using setImmediate to ensure it runs after response is sent
        setImmediate(() => {
            if (process.env.USE_MOCK_EMAIL !== 'false') {
                mockSendConfirmationEmail(user.email, confirmationToken).catch((err) => {
                    console.warn('Failed to send confirmation email:', err)
                    // Don't fail registration if email fails - this is optional
                })
            }
        })

    } catch (error) {
        console.error('Registration error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}