import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

type KVUser = {
    id: string
    email: string
    name: string
    password: string
    provider: string
    createdAt: string
    isPublic?: boolean
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
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await kv.get<KVUser>(`user:${credentials.email.toLowerCase()}`)
                if (!user) return null

                const passwordMatch = await bcrypt.compare(credentials.password, user.password)
                if (!passwordMatch) return null

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                }
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
                    const newUser: KVUser = {
                        id,
                        email,
                        name: user.name ?? email,
                        password: '',
                        provider: 'google',
                        createdAt: new Date().toISOString(),
                    }
                    await kv.set(`user:${email}`, newUser)
                    await kv.set(`user:id:${id}`, email)
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
    pages: {
        signIn: '/auth/signin',
    },
}
