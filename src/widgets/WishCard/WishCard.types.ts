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
  reservedBy?: string
  showOwnerAction?: boolean
  showGuestAction?: boolean
  onReserve?: (wishId: string, reservedBy: string) => void
  onReserveError?: (wishId: string) => void
  onCancelReservation?: (wishId: string) => void
  onCancelError?: (wishId: string) => void
  userId?: string
  useMock?: boolean
}