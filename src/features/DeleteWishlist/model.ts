'use client'

import { useCallback, useState } from 'react'

import { deleteWishlist } from '@/shared/api/wishlist/deleteWishlist'

type TUseDeleteWishlistModelParams = {
    wishlistId: string
    onDelete?: (wishlistId: string) => void
    onError?: (wishlistId: string) => void
}

export const useDeleteWishlistModel = ({
    wishlistId,
    onDelete,
    onError,
}: TUseDeleteWishlistModelParams) => {
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    const openConfirm = useCallback(() => {
        setIsConfirmOpen(true)
        setError(null)
    }, [])

    const closeConfirm = useCallback(() => {
        setIsConfirmOpen(false)
        setError(null)
    }, [])

    const handleDelete = useCallback(async () => {
        setError(null)
        setIsDeleting(true)
        setIsConfirmOpen(false)

        try {
            await deleteWishlist(wishlistId)
            onDelete?.(wishlistId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete wishlist')
            onError?.(wishlistId)
        } finally {
            setIsDeleting(false)
        }
    }, [wishlistId, onDelete, onError])

    return {
        isDeleting,
        error,
        handleDelete,
        isConfirmOpen,
        openConfirm,
        closeConfirm,
    }
}
