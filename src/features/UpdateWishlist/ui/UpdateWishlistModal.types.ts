import {TWishlistFormData} from '@/entities/wishlist';

export type TUpdateWishlistModal = {
  onClose?: () => void
  onSubmit: (wishlistData: TWishlistFormData) => void
  initialData?: Partial<TWishlistFormData>
}