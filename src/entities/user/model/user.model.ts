"use client"

import { useId } from "react"

import type { Session } from "next-auth"
import { useSession, signIn, signOut } from "next-auth/react"

import { TUserPrivate } from "@/entities/user";

export const useUserModel = () => {
    const { data: session, status } = useSession()
    // Stable per-mount fallback id (a random value in render changes on every render).
    const anonId = useId()

    const user: TUserPrivate | null = session?.user
        ? {
            id:
            // Si NextAuth ne fournit pas d'id, on génère un identifiant stable de secours
                session.user.id ??
                (session.user.email
                    ? `email:${session.user.email}`
                    : `anon:${anonId}`),

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