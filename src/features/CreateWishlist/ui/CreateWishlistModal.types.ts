import {TWishlistFormData} from '@/entities/wishlist';

export type TCreateWishlistModal = {
    onClose?: () => void
    onSubmit: (wishlistData: TWishlistFormData & { id: string; isPending?: boolean }) => void
}