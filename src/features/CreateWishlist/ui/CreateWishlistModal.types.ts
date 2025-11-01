import {TWishlistFormData} from '@/entities/wishlist';

export type TCreateWishlistModal = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (wishlistData: TWishlistFormData) => void
}