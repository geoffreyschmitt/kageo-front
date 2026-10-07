"use client"

import {useCallback, useState} from "react"

import {deleteWish} from "@/shared/api/wish/deleteWish";

type TUseDeleteWishModelParams = {
    wishId: string
    wishName?: string
    onDelete?: (wishId: string) => void
    onError?: (wishId: string) => void
}

export const useDeleteWishModel = ({
    wishId,
    wishName,
    onDelete,
    onError,
}: TUseDeleteWishModelParams) => {
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
            // Optimistic update: call onDelete immediately
            if (onDelete) {
                onDelete(wishId)
            }

            // Backend sync
            await deleteWish(wishId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete wish")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsDeleting(false)
        }
    }, [wishId, onDelete, onError])

    return {
        isDeleting,
        error,
        handleDelete,
        isConfirmOpen,
        openConfirm,
        closeConfirm,
        wishName,
    }
}
