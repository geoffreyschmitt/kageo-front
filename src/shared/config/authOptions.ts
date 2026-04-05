import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'

type KVUser = {
    id: string
    email: string
    name: string
    password: string
    provider: string
    createdAt: string
}

export const authOptions: NextAuthOptions = {
    providers: [
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
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
