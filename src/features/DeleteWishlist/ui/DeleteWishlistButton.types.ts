import type { ReactNode } from 'react'

export type TDeleteWishlistButton = {
    wishlistId: string
    wishlistName?: string
    onDelete?: (wishlistId: string) => void
    onError?: (wishlistId: string) => void
    className?: string
    children: ReactNode
}
