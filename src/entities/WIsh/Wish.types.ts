export type TWish = {
  id: string
  name: string
  description: string
  price: number
  currency: string
  imageUrl: string
  priority: "low" | "medium" | "high"
  status: "wanted" | "purchased" | "reserved"
  purchaseUrl?: string
  notes?: string
  addedDate: string
}