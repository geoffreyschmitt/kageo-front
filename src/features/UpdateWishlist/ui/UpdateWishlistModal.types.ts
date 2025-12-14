import {TWishlistFormData} from '@/entities/wishlist';

export type TUpdateWishlistModal = {
  onClose?: () => void
  onSubmit: (wishlistData: TWishlistFormData & { id: string }) => void
  initialData?: Partial<TWishlistFormData> & { id?: string }
}