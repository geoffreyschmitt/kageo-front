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
    eventDate: Date
    createdAt: Date
    updatedAt: Date
}