export type TWishlistCard = {
    id: string
    ownerId: string
    ownerName: string
    name: string
    description: string
    coverImage?: string
    createdAt: Date
    isPublic: boolean
    itemCount?: number
}