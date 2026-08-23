'use client'
import { useState } from 'react'

import Wishlist from '@/views/wishlist/wishlist'
import { TWishCard } from '@/widgets/WishCard/WishCard.types'
import { TWishFormData, TProposedWishFormData } from '@/entities/wish'
import { eventBus } from '@/shared/eventBus'

type Props = {
    id: string
    name: string
    description: string
    isPublic: boolean
    eventDate: string
    ownerId: string
    ownerName: string
    currency: string
    userIsOwner: boolean
    isHistory: boolean
    userId: string
    initialItems: TWishCard[]
    initialTotalContributed: number
    initialUserContributed: number
}

const toast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') =>
    eventBus.emit('ui:toast', { message, type })

export default function WishlistPageClient({
    id,
    name,
    description,
    isPublic,
    eventDate,
    ownerId,
    ownerName,
    currency,
    userIsOwner,
    isHistory,
    userId,
    initialItems,
    initialTotalContributed,
    initialUserContributed,
}: Props) {
    const [items, setItems] = useState<TWishCard[]>(initialItems)
    const [totalContributed, setTotalContributed] = useState(initialTotalContributed)
    const [userContributed, setUserContributed] = useState(initialUserContributed)

    const handleReserveWish = (wishId: string, reservedBy: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'reserved', reservedBy } : item
        ))
        const name = items.find((i) => i.id === wishId)?.name
        toast(name ? `"${name}" reserved` : 'Wish reserved', 'success')
    }

    const handleReserveError = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId
                ? { ...item, status: item.isProposed ? 'proposed' : 'wanted', reservedBy: undefined }
                : item
        ))
        toast('Could not reserve wish — please try again', 'error')
    }

    const handleCancelReservation = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'wanted', reservedBy: undefined } : item
        ))
        toast('Reservation cancelled', 'info')
    }

    const handleCancelError = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'reserved', reservedBy: userId } : item
        ))
        toast('Could not cancel reservation — please try again', 'error')
    }

    const handleMarkPurchased = (wishId: string, purchasedBy: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'purchased', purchasedBy } : item
        ))
        const name = items.find((i) => i.id === wishId)?.name
        toast(name ? `"${name}" marked as purchased` : 'Wish marked as purchased', 'success')
    }

    const handleMarkPurchasedError = (wishId: string) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== wishId) return item
            return { ...item, status: item.reservedBy ? 'reserved' : 'wanted', purchasedBy: undefined }
        }))
        toast('Could not mark as purchased — please try again', 'error')
    }

    const handleRemovePurchased = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'wanted', purchasedBy: undefined } : item
        ))
        toast('Marked as available again', 'info')
    }

    const handleRemovePurchasedError = (wishId: string) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== wishId) return item
            const original = initialItems.find((i) => i.id === wishId)
            return { ...item, status: 'purchased', purchasedBy: original?.purchasedBy }
        }))
        toast('Could not update wish — please try again', 'error')
    }

    const handleDeleteWish = (wishId: string) => {
        const name = items.find((i) => i.id === wishId)?.name
        setItems((prev) => prev.filter((item) => item.id !== wishId))
        toast(name ? `"${name}" deleted` : 'Wish deleted', 'info')
    }

    const handleDeleteError = (wishId: string) => {
        const original = initialItems.find((item) => item.id === wishId)
        if (original) setItems((prev) => [...prev, original])
        toast('Could not delete wish — please try again', 'error')
    }

    const handleUpdateWish = (wishId: string, updatedWish: TWishFormData & { id: string }) => {
        setItems((prev) => prev.map((item) =>
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

    const handleAddWish = (wish: TWishFormData & { id: string }) => {
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
        setItems((prev) => [...prev, newWishCard])
    }

    const handleProposeWish = (wish: TProposedWishFormData & { id: string }) => {
        const newWishCard: TWishCard = {
            id: wish.id,
            name: wish.name,
            description: wish.description,
            price: wish.price,
            currency: wish.currency,
            imageUrl: wish.imageUrl,
            priority: 'medium',
            status: 'proposed',
            isProposed: true,
            purchaseUrl: wish.purchaseUrl,
            notes: wish.notes,
            addedDate: 'just now',
        }
        setItems((prev) => [...prev, newWishCard])
    }

    const handleContribute = (_wishlistId: string, amount: number) => {
        setTotalContributed((prev) => prev + amount)
        setUserContributed((prev) => prev + amount)
        toast('Thank you! Your gift has been added to the pot', 'success')
    }

    const handleContributeError = (_wishlistId: string, amount: number) => {
        setTotalContributed((prev) => prev - amount)
        setUserContributed((prev) => prev - amount)
        toast('Could not add your contribution — please try again', 'error')
    }

    return (
        <main>
            <Wishlist
                id={id}
                name={name}
                description={description}
                isPublic={isPublic}
                eventDate={eventDate}
                ownerId={ownerId}
                ownerName={ownerName}
                currency={currency}
                items={items}
                userIsOwner={userIsOwner}
                isHistory={isHistory}
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
                onUpdateWish={handleUpdateWish}
                onAddWish={handleAddWish}
                onProposeWish={handleProposeWish}
                onContribute={handleContribute}
                onContributeError={handleContributeError}
                totalContributed={totalContributed}
                userContributed={userContributed}
                useMock={false}
            />
        </main>
    )
}
