import {TAddWishlistItemFormData} from "@/features/add-wishlist-item/model";

export type TAddWishlistItemModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (itemData: TAddWishlistItemFormData) => void
}