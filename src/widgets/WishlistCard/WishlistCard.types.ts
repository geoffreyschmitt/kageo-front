export type TWishlistCard = {
    id: string
    ownerId: string
    ownerName: string
    name: string
    description: string
    coverImage?: string
    previewImages?: string[]
    eventDate: Date
    createdAt: Date
    isPublic: boolean
    itemCount?: number
    isPending?: boolean
    isHistory?: boolean
}