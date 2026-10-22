import type { TShareWishlistResponse } from "@/shared/api/wishlist/shareWishlist"

export type TShareWishlistModal = {
    isOpen: boolean
    onClose: () => void
    wishlistUrl: string
    wishlistName: string
    onSendEmail: (email: string, url: string) => Promise<TShareWishlistResponse>
}