"use client"

import {useCallback, useState} from "react"

import {removePurchased} from "@/shared/api/wish/removePurchased";

type TUseRemovePurchasedWishModelParams = {
    wishId: string
    onRemovePurchased?: (wishId: string) => void
    onError?: (wishId: string) => void
}

export const useRemovePurchasedWishModel = ({
    wishId,
    onRemovePurchased,
    onError,
}: TUseRemovePurchasedWishModelParams) => {
    const [isRemoving, setIsRemoving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleRemovePurchased = useCallback(async () => {
        setError(null)
        setIsRemoving(true)

        try {
            // Optimistic update: call onRemovePurchased immediately
            if (onRemovePurchased) {
                onRemovePurchased(wishId)
            }

            // Backend sync
            await removePurchased(wishId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove purchased status")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsRemoving(false)
        }
    }, [wishId, onRemovePurchased, onError])

    return {
        isRemoving,
        error,
        handleRemovePurchased,
    }
}
