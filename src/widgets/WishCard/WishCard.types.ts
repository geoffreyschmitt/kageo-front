import {TWishPriority, TWishStatus} from '@/entities/wish';


export type TWishCard = {
  id: string
  name: string
  description: string
  price: number
  currency: string
  imageUrl: string
  priority: TWishPriority
  status: TWishStatus
  purchaseUrl?: string
  notes?: string
  addedDate: string
  // Number of comments on this wish. Only populated for non-owner viewers
  // (comments are never exposed to the wishlist owner).
  commentCount?: number
  reservedBy?: string
  purchasedBy?: string
  isProposed?: boolean
  // Set on a proposed wish when the guest chose to share it with the owner.
  showToOwner?: boolean
  showOwnerAction?: boolean
  showGuestAction?: boolean
  // Explicit ownership flag for gating comments — unlike showOwnerAction/showGuestAction,
  // this must stay true for the owner in history mode too, since comments should never
  // reach the owner regardless of view mode.
  isOwner?: boolean
  onReserve?: (wishId: string, reservedBy: string) => void
  onReserveError?: (wishId: string) => void
  onCancelReservation?: (wishId: string) => void
  onCancelError?: (wishId: string) => void
  onMarkPurchased?: (wishId: string, userId: string) => void
  onMarkPurchasedError?: (wishId: string) => void
  onRemovePurchased?: (wishId: string) => void
  onRemovePurchasedError?: (wishId: string) => void
  onDeleteWish?: (wishId: string) => void
  onDeleteError?: (wishId: string) => void
  onEditWish?: (wish: TWishCard) => void
  userId?: string
  useMock?: boolean
}