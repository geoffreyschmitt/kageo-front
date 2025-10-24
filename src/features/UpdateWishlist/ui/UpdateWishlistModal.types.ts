import {TWishlistFormData} from "@/entities/wishlist";

export type TUpdateWishlistModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (wishlistData: TWishlistFormData) => void
    initialData?: Partial<TWishlistFormData>
}