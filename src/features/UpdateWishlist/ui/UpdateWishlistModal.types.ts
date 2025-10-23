import {TEditWishlistFormData} from "@/entities/wishlist";

export type TUpdateWishlistModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (wishlistData: TEditWishlistFormData) => void
    initialData?: Partial<TEditWishlistFormData>
}