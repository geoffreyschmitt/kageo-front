import {TWishPriority, TWishStatus} from '@/entities/wish';
import type {TGiftPotView} from '@/shared/api/wish/getGiftPot';


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
  // An archived (history) wishlist is read-only: no gift pot can be opened or joined.
  isHistory?: boolean
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
  giftPot?: TGiftPotView | null
  onGiftPotCreated?: (wishId: string, creatorId: string, creatorName: string) => void
  onContributeGiftPot?: (wishId: string, delta: number) => void
  onContributeGiftPotError?: (wishId: string, delta: number) => void
  onGiftPotRemoved?: (wishId: string, removedAmount: number) => void
  onGiftPotRefreshed?: (wishId: string, view: TGiftPotView | null) => void
  isLoggedIn?: boolean
  isInvited?: boolean
  eventName?: string
  ownerName?: string
}