import { randomUUID } from 'crypto'

import { kv } from '@vercel/kv'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

import { authorizeCredentials } from '@/shared/config/authorizeCredentials'


type KVUser = {
    id: string
    email: string
    name: string
    password: string
    provider: string
    createdAt: string
    isPublic?: boolean
    termsAcceptedAt?: string
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {
                const forwardedFor = req?.headers?.['x-forwarded-for']
                return authorizeCredentials(credentials, typeof forwardedFor === 'string' ? forwardedFor : undefined)
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'google' && user.email) {
                const email = user.email.toLowerCase()
                const existing = await kv.get<KVUser>(`user:${email}`)
                if (!existing) {
                    const id = randomUUID()
                    const now = new Date().toISOString()
                    const newUser: KVUser = {
                        id,
                        email,
                        name: user.name ?? email,
                        password: '',
                        provider: 'google',
                        createdAt: now,
                        // The sign-up screen shows the terms and privacy notice next to the Google button
                        // (and disables it in sign-up mode until the box is ticked).
                        termsAcceptedAt: now,
                    }
                    await kv.multi().set(`user:${email}`, newUser).set(`user:id:${id}`, email).exec()
                    user.id = id
                } else {
                    user.id = existing.id
                }
            }
            return true
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
            }
            if (trigger === 'update' && session?.name) {
                token.name = session.name
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string
            }
            return session
        },
    },
    session: {
        strategy: 'jwt',
    },
}
