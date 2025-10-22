export type TAddWishlistItemFormData = {
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: "low" | "medium" | "high"
    purchaseUrl: string
    notes: string
}