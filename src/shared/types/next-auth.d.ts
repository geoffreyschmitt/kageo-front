import { DefaultSession, DefaultUser } from "next-auth"

// 1. Étendre le type 'Session'
declare module "next-auth" {
    interface Session {
        user: {
            id: string // L'ID que vous voulez absolument
        } & DefaultSession["user"] // Conserve les propriétés par défaut (name, email, image)
    }

    interface User extends DefaultUser {
        id: string
    }
}