export type TWishlist = {
    id: string
    ownerId: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    allowSuggestions: boolean
    eventDate: Date
    createdAt: Date
    updatedAt: Date
}