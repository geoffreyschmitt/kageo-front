export type TWishPriority = "low" | "medium" | "high"

export type TWishStatus = "wanted" | "purchased" | "reserved" | "proposed"

export type TWish = {
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
}