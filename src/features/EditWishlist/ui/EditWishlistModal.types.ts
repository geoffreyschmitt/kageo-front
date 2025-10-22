import {TEditWishlistFormData} from "@/features/EditWishlist/model";

export type TEditWishlistModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (wishlistData: TEditWishlistFormData) => void
    initialData: {
        name: string
        description: string
        isPublic: boolean
        coverImage?: string
        category?: string
        allowComments?: boolean
        allowSuggestions?: boolean
        notifyOnPurchase?: boolean
    }
}