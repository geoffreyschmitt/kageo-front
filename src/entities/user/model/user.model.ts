"use client"

import type { Session } from "next-auth"
import { useSession, signIn, signOut } from "next-auth/react"

import { TUserPrivate } from "@/entities/user";

export const useUserModel = () => {
    const { data: session, status } = useSession()

    const user: TUserPrivate | null = session?.user
        ? {
            id:
            // Si NextAuth ne fournit pas d'id, on génère un identifiant stable de secours
                session.user.id ??
                (session.user.email
                    ? `email:${session.user.email}`
                    : `anon:${Math.random().toString(36).substring(2, 10)}`),

            name: session.user.name ?? null,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
        }
        : null

    if (status === "authenticated" && !user?.id) {
        console.warn("[useUserModel] Session authenticated but missing user.id")
    }

    return {
        user,
        session: session as Session | null,
        status, // "loading" | "authenticated" | "unauthenticated"
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        signIn,
        signOut,
    }
}