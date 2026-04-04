"use client"

import {useCallback, useState} from "react"

import {deleteWish} from "@/shared/api/wish/deleteWish";
import {mockDeleteWish} from "./lib/mockDeleteWish"

type TUseDeleteWishModelParams = {
    wishId: string
    wishName?: string
    onDelete?: (wishId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}

export const useDeleteWishModel = ({
    wishId,
    wishName,
    onDelete,
    onError,
    useMock = false,
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
            const runner = useMock ? mockDeleteWish : deleteWish
            await runner(wishId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete wish")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsDeleting(false)
        }
    }, [wishId, onDelete, onError, useMock])

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
