export const WISHLIST_CATEGORIES = [
    { value: 'general', label: 'General' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'wedding', label: 'Wedding' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'baby', label: 'Baby Shower' },
    { value: 'graduation', label: 'Graduation' },
    { value: 'home', label: 'Home & Garden' },
    { value: 'tech', label: 'Technology' },
    { value: 'books', label: 'Books & Media' },
    { value: 'fashion', label: 'Fashion & Style' },
    { value: 'travel', label: 'Travel' },
    { value: 'hobbies', label: 'Hobbies & Crafts' },
] as const

export type WishlistCategory = typeof WISHLIST_CATEGORIES[number]['value']

export const DEFAULT_WISHLIST_SETTINGS = {
    name: '',
    description: '',
    isPublic: false,
    coverImage: '',
    category: 'general' as WishlistCategory,
    allowComments: true,
    allowSuggestions: true,
    notifyOnPurchase: true,
} as const