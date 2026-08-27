'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

import Wishlist from '@/views/wishlist/wishlist'
import { TWishCard } from '@/widgets/WishCard/WishCard.types'
import { TWishFormData, TProposedWishFormData } from '@/entities/wish'
import { TWishlistFormData } from '@/entities/wishlist'
import { eventBus } from '@/shared/eventBus'
import { useRouter } from '@/shared/i18n/navigation'

type Props = {
    id: string
    name: string
    description: string
    isPublic: boolean
    eventDate: string
    coverImage: string
    allowSuggestions: boolean
    ownerId: string
    ownerName: string
    ownerProfileUrl: string | null
    currency: string
    userIsOwner: boolean
    isHistory: boolean
    hasActivity: boolean
    userId: string
    isLoggedIn: boolean
    isInvited: boolean
    initialItems: TWishCard[]
    initialTotalContributed: number
    initialUserContributed: number
    initialPotCreatorName: string | null
}

const toast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') =>
    eventBus.emit('ui:toast', { message, type })

export default function WishlistPageClient({
    id,
    name,
    description,
    isPublic,
    eventDate,
    coverImage,
    allowSuggestions,
    ownerId,
    ownerName,
    ownerProfileUrl,
    currency,
    userIsOwner,
    isHistory,
    hasActivity,
    userId,
    isLoggedIn,
    isInvited,
    initialItems,
    initialTotalContributed,
    initialUserContributed,
    initialPotCreatorName,
}: Props) {
    const t = useTranslations('wishlistToast')
    const router = useRouter()
    const [items, setItems] = useState<TWishCard[]>(initialItems)
    const [totalContributed, setTotalContributed] = useState(initialTotalContributed)
    const [userContributed, setUserContributed] = useState(initialUserContributed)
    const [potCreatorName, setPotCreatorName] = useState(initialPotCreatorName)
    const [wishlistMeta, setWishlistMeta] = useState({ name, description, isPublic, eventDate, coverImage, allowSuggestions })

    const handlePotCreated = (_creatorId: string, creatorName: string) => {
        setPotCreatorName(creatorName)
        toast(t('potStarted'), 'success')
    }

    const handleReserveWish = (wishId: string, reservedBy: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'reserved', reservedBy } : item
        ))
        const name = items.find((i) => i.id === wishId)?.name
        toast(name ? t('wishReserved', { name }) : t('wishReservedFallback'), 'success')
    }

    const handleReserveError = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId
                ? { ...item, status: item.isProposed ? 'proposed' : 'wanted', reservedBy: undefined }
                : item
        ))
        toast(t('reserveError'), 'error')
    }

    const handleCancelReservation = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'wanted', reservedBy: undefined } : item
        ))
        toast(t('reservationCancelled'), 'info')
    }

    const handleCancelError = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'reserved', reservedBy: userId } : item
        ))
        toast(t('cancelError'), 'error')
    }

    const handleMarkPurchased = (wishId: string, purchasedBy: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'purchased', purchasedBy } : item
        ))
        const name = items.find((i) => i.id === wishId)?.name
        toast(name ? t('wishMarkedPurchased', { name }) : t('wishMarkedPurchasedFallback'), 'success')
    }

    const handleMarkPurchasedError = (wishId: string) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== wishId) return item
            return { ...item, status: item.reservedBy ? 'reserved' : 'wanted', purchasedBy: undefined }
        }))
        toast(t('markPurchasedError'), 'error')
    }

    const handleRemovePurchased = (wishId: string) => {
        setItems((prev) => prev.map((item) =>
            item.id === wishId ? { ...item, status: 'wanted', purchasedBy: undefined } : item
        ))
        toast(t('markedAvailable'), 'info')
    }

    const handleRemovePurchasedError = (wishId: string) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== wishId) return item
            const original = initialItems.find((i) => i.id === wishId)
            return { ...item, status: 'purchased', purchasedBy: original?.purchasedBy }
        }))
        toast(t('updateError'), 'error')
    }

    const handleDeleteWish = (wishId: string) => {
        const name = items.find((i) => i.id === wishId)?.name
        setItems((prev) => prev.filter((item) => item.id !== wishId))
        toast(name ? t('wishDeleted', { name }) : t('wishDeletedFallback'), 'info')
    }

    const handleDeleteError = (wishId: string) => {
        const original = initialItems.find((item) => item.id === wishId)
        if (original) setItems((prev) => [...prev, original])
        toast(t('deleteError'), 'error')
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
        toast(t('contributionAdded'), 'success')
    }

    const handleUpdateWishlistMeta = (updated: TWishlistFormData & { id: string }) => {
        setWishlistMeta({
            name: updated.name,
            description: updated.description,
            isPublic: updated.isPublic,
            eventDate: updated.eventDate,
            coverImage: updated.coverImage ?? '',
            allowSuggestions: updated.allowSuggestions ?? true,
        })
        toast(t('wishlistUpdated'), 'success')
    }

    const handleDeleteWishlist = () => {
        toast(t('wishlistDeleted'), 'success')
        router.push(isHistory ? '/history' : '/wishlists')
    }

    const handleDeleteWishlistError = () => {
        toast(t('wishlistDeleteError'), 'error')
    }

    const handleContributeError = (_wishlistId: string, amount: number) => {
        setTotalContributed((prev) => prev - amount)
        setUserContributed((prev) => prev - amount)
        toast(t('contributionError'), 'error')
    }

    return (
        <main>
            <Wishlist
                id={id}
                name={wishlistMeta.name}
                description={wishlistMeta.description}
                isPublic={wishlistMeta.isPublic}
                eventDate={wishlistMeta.eventDate}
                coverImage={wishlistMeta.coverImage}
                allowSuggestions={wishlistMeta.allowSuggestions}
                ownerId={ownerId}
                ownerName={ownerName}
                ownerProfileUrl={ownerProfileUrl}
                currency={currency}
                items={items}
                userIsOwner={userIsOwner}
                isHistory={isHistory}
                hasActivity={hasActivity}
                userId={userId}
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
                onUpdateWishlistMeta={handleUpdateWishlistMeta}
                onDeleteWishlist={handleDeleteWishlist}
                onDeleteWishlistError={handleDeleteWishlistError}
                onContribute={handleContribute}
                onContributeError={handleContributeError}
                totalContributed={totalContributed}
                userContributed={userContributed}
                isLoggedIn={isLoggedIn}
                isInvited={isInvited}
                potCreatorName={potCreatorName}
                onPotCreated={handlePotCreated}
                useMock={false}
            />
        </main>
    )
}
