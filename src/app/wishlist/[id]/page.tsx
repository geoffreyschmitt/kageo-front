import Wishlist from '@/pages/wishlist/wishlist'
import {mockUserPrivate} from '@/entities/user';

// Sample data for a single wishlist
const sampleOwnerWishlistData = {
    id: '1',
    name: 'Birthday Wishlist 2024',
    description:
        'All the amazing things I\'m hoping to get for my birthday this year. From the latest tech gadgets to cozy home decor, this list has everything that would make my special day even more memorable!',
    isPublic: true,
    createdDate: 'January 15, 2024',
    ownerId: '1',
    ownerName: 'Sarah Johnson',
    totalValue: 1247.5,
    currency: '$',
    items: [
        {
            id: '1',
            name: 'Wireless Noise-Cancelling Headphones',
            description:
                'Premium over-ear headphones with active noise cancellation, perfect for work and travel. Features 30-hour battery life and premium sound quality.',
            price: 299.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'high' as const,
            status: 'wanted' as const,
            purchaseUrl: 'https://example.com/headphones',
            notes: 'Prefer black or silver color. Sony or Bose brand preferred.',
            addedDate: '2 weeks ago',
        },
        {
            id: '2',
            name: 'Smart Fitness Watch',
            description:
                'Advanced fitness tracker with heart rate monitoring, GPS, and sleep tracking. Water-resistant design perfect for all activities.',
            price: 399.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'high' as const,
            status: 'reserved' as const,
            notes: 'Size medium, prefer sport band in blue or black.',
            addedDate: '1 week ago',
        },
        {
            id: '3',
            name: 'Cozy Reading Chair',
            description:
                'Comfortable armchair perfect for reading sessions. Soft fabric upholstery with excellent back support and a matching ottoman.',
            price: 449.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'medium' as const,
            status: 'wanted' as const,
            purchaseUrl: 'https://example.com/chair',
            notes: 'Neutral colors preferred - beige, gray, or cream.',
            addedDate: '3 weeks ago',
        },
        {
            id: '4',
            name: 'Professional Coffee Maker',
            description:
                'High-end espresso machine with built-in grinder. Makes café-quality coffee at home with programmable settings.',
            price: 89.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'low' as const,
            status: 'purchased' as const,
            addedDate: '1 month ago',
        },
        {
            id: '5',
            name: 'Kindle E-Reader',
            description:
                'Latest generation e-reader with adjustable warm light, waterproof design, and weeks of battery life. Perfect for reading anywhere.',
            price: 139.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'medium' as const,
            status: 'wanted' as const,
            purchaseUrl: 'https://example.com/kindle',
            notes: '32GB storage preferred. Include a nice case if possible.',
            addedDate: '5 days ago',
        },
        {
            id: '6',
            name: 'Yoga Mat Set',
            description:
                'Premium yoga mat with alignment lines, carrying strap, and matching blocks. Non-slip surface and eco-friendly materials.',
            price: 67.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'low' as const,
            status: 'wanted' as const,
            purchaseUrl: 'https://example.com/yoga-mat',
            addedDate: '1 week ago',
        },
        {
            id: '8',
            name: 'Art Supplies Set',
            description:
                'Professional art supplies set including high-quality brushes, paints, and canvas. Perfect for exploring artistic creativity.',
            price: 45.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'medium' as const,
            status: 'wanted' as const,
            notes: 'Watercolor or acrylic set preferred.',
            addedDate: '3 days ago',
        },
    ],
}

const sampleGuestWishlistData = {
    ...sampleOwnerWishlistData,
    items: [
        ...sampleOwnerWishlistData.items,
        {
            id: '7',
            name: 'Smart Home Security System',
            description: 'Complete home security system with cameras, motion sensors, and smartphone integration. Easy DIY installation and 24/7 monitoring capabilities.',
            price: 299.99,
            currency: '$',
            imageUrl: '/placeholder.svg?height=200&width=200',
            priority: 'medium' as const,
            status: 'proposed' as const, // TODO change system, wont work if proposed and purchased
            purchaseUrl: 'https://example.com/security-system',
            notes: 'Looking for a system compatible with existing smart home setup.',
            addedDate: '2 days ago',
        },
    ],
}

export default function WishlistPage() {
    const user = mockUserPrivate
    //const userIsOwner = user.id && ownerId === user.id
    const userIsOwner = false
    return (
        <main>
            <Wishlist
                {...(userIsOwner ? sampleOwnerWishlistData : sampleGuestWishlistData)}
                userIsOwner={userIsOwner}
            />
        </main>
    )
}
