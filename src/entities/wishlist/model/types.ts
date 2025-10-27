export type TWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    allowComments: boolean
    allowSuggestions: boolean
    notifyOnPurchase: boolean
    createdAt: Date
    updatedAt: Date
}