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
  showOwnerAction?: boolean
  showGuestAction?: boolean
}