import type { WishlistCategory } from './constants'

export type Wishlist = {
    id: string
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    category: WishlistCategory
    allowComments: boolean
    allowSuggestions: boolean
    notifyOnPurchase: boolean
    createdAt: Date
    updatedAt: Date
    userId: string
}

export type WishlistFormData = Omit<Wishlist, 'id' | 'createdAt' | 'updatedAt' | 'userId'>