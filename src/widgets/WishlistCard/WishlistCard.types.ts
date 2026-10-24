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
    isOwnedByCurrentUser?: boolean
    /** Hide the "By {owner}" line where the owner is already obvious (own dashboard, a profile page). */
    hideOwner?: boolean
}