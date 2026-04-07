'use client'

import {use, useState} from 'react'

import Wishlist from '@/pages/wishlist/wishlist'
import {mockUserPrivate} from '@/entities/user';
import type {TWishCard} from '@/widgets/WishCard/WishCard.types';
import type {TWishFormData, TProposedWishFormData} from '@/entities/wish';
import {eventBus} from '@/shared/eventBus';

// Sample data for a single wishlist
const sampleOwnerWishlistData = {
    id: '1',
    name: 'Birthday Wishlist 2024',
    description:
        'All the amazing things I\'m hoping to get for my birthday this year. From the latest tech gadgets to cozy home decor, this list has everything that would make my special day even more memorable!',
    isPublic: true,
    eventDate: 'August 15, 2026',
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
            reservedBy: mockUserPrivate.id,
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
            status: 'proposed' as const,
            isProposed: true,
            purchaseUrl: 'https://example.com/security-system',
            notes: 'Looking for a system compatible with existing smart home setup.',
            addedDate: '2 days ago',
        },
    ],
}

export default function WishlistPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const userIsOwner = id !== 'shared'
    const user = mockUserPrivate

    const initialData = userIsOwner ? sampleOwnerWishlistData : sampleGuestWishlistData
    const [items, setItems] = useState<TWishCard[]>(initialData.items)

    const toast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') =>
        eventBus.emit('ui:toast', { message, type })

    const handleReserveWish = (wishId: string, reservedBy: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId
                ? {...item, status: 'reserved', reservedBy}
                : item
        ))
        const name = items.find(i => i.id === wishId)?.name
        toast(name ? `"${name}" reserved` : 'Wish reserved', 'success')
    }

    const handleReserveError = (wishId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId
                ? {...item, status: item.isProposed ? 'proposed' : 'wanted', reservedBy: undefined}
                : item
        ))
        toast('Could not reserve wish — please try again', 'error')
    }

    const handleCancelReservation = (wishId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId
                ? {...item, status: 'wanted', reservedBy: undefined}
                : item
        ))
        toast('Reservation cancelled', 'info')
    }

    const handleCancelError = (wishId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId
                ? {...item, status: 'reserved', reservedBy: user.id}
                : item
        ))
        toast('Could not cancel reservation — please try again', 'error')
    }

    const handleMarkPurchased = (wishId: string, userId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId
                ? {...item, status: 'purchased', purchasedBy: userId}
                : item
        ))
        const name = items.find(i => i.id === wishId)?.name
        toast(name ? `"${name}" marked as purchased` : 'Wish marked as purchased', 'success')
    }

    const handleMarkPurchasedError = (wishId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === wishId) {
                const previousStatus = item.reservedBy ? 'reserved' : 'wanted'
                return {...item, status: previousStatus, purchasedBy: undefined}
            }
            return item
        }))
        toast('Could not mark as purchased — please try again', 'error')
    }

    const handleRemovePurchased = (wishId: string) => {
        setItems(prev => prev.map(item =>
            item.id === wishId
                ? {...item, status: 'wanted', purchasedBy: undefined}
                : item
        ))
        toast('Marked as available again', 'info')
    }

    const handleRemovePurchasedError = (wishId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === wishId) {
                const originalItem = initialData.items.find(original => original.id === wishId)
                const restoredPurchasedBy = originalItem && originalItem.status === 'purchased'
                    ? (originalItem as any).purchasedBy
                    : item.purchasedBy
                return {...item, status: 'purchased', purchasedBy: restoredPurchasedBy}
            }
            return item
        }))
        toast('Could not update wish — please try again', 'error')
    }

    const handleEditWish = (wish: TWishCard) => {
        // This handler is called when edit button is clicked
        // The actual modal opening is handled in wishlist.tsx
        console.log('Edit wish clicked:', wish)
    }

    const handleUpdateWish = (wishId: string, updatedWish: TWishFormData & { id: string }) => {
        // Optimistic update: immediately update the wish in items state
        setItems(prev => prev.map(item =>
            item.id === wishId
                ? {
                    ...item,
                    name: updatedWish.name,
                    description: updatedWish.description,
                    price: updatedWish.price,
                    currency: updatedWish.currency,
                    imageUrl: updatedWish.imageUrl,
                    priority: updatedWish.priority,
                    purchaseUrl: updatedWish.purchaseUrl,
                    notes: updatedWish.notes,
                }
                : item
        ))
    }

    const handleDeleteWish = (wishId: string) => {
        const name = items.find(i => i.id === wishId)?.name
        setItems(prev => prev.filter(item => item.id !== wishId))
        toast(name ? `"${name}" deleted` : 'Wish deleted', 'info')
    }

    const handleDeleteError = (wishId: string) => {
        const originalWish = initialData.items.find(item => item.id === wishId)
        if (originalWish) {
            setItems(prev => [...prev, originalWish])
        }
        toast('Could not delete wish — please try again', 'error')
    }

    const handleAddWish = (wish: TWishFormData & { id: string }) => {
        // Convert TWishFormData to TWishCard and add to items state
        const newWishCard: TWishCard = {
            id: wish.id,
            name: wish.name,
            description: wish.description,
            price: wish.price,
            currency: wish.currency,
            imageUrl: wish.imageUrl,
            priority: wish.priority,
            status: 'wanted',
            purchaseUrl: wish.purchaseUrl,
            notes: wish.notes,
            addedDate: 'just now',
        }
        setItems(prev => [...prev, newWishCard])
    }

    const handleProposeWish = (wish: TProposedWishFormData & { id: string }) => {
        // Convert TProposedWishFormData to TWishCard and add to items state
        const newWishCard: TWishCard = {
            id: wish.id,
            name: wish.name,
            description: wish.description,
            price: wish.price,
            currency: wish.currency,
            imageUrl: wish.imageUrl,
            priority: 'medium', // default since proposed wishes don't have priority in form
            status: 'proposed',
            isProposed: true,
            purchaseUrl: wish.purchaseUrl,
            notes: wish.notes,
            addedDate: 'just now',
        }
        setItems(prev => [...prev, newWishCard])
    }

    return (
        <main>
            <Wishlist
                {...initialData}
                items={items}
                userIsOwner={userIsOwner}
                onReserveWish={handleReserveWish}
                onReserveError={handleReserveError}
                onCancelReservation={handleCancelReservation}
                onCancelError={handleCancelError}
                onMarkPurchasedWish={handleMarkPurchased as (wishId: string) => void}
                onMarkPurchasedError={handleMarkPurchasedError}
                onRemovePurchasedWish={handleRemovePurchased}
                onRemovePurchasedError={handleRemovePurchasedError}
                onDeleteWish={handleDeleteWish}
                onDeleteError={handleDeleteError}
                onEditWish={handleEditWish}
                onUpdateWish={handleUpdateWish}
                onAddWish={handleAddWish}
                onProposeWish={handleProposeWish}
                useMock={true}
            />
        </main>
    )
}

