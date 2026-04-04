"use client"

import {useCallback, useState} from "react"

import {removePurchased} from "@/shared/api/wish/removePurchased";
import {mockRemovePurchasedWish} from "./lib/mockRemovePurchasedWish"

type TUseRemovePurchasedWishModelParams = {
    wishId: string
    onRemovePurchased?: (wishId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}

export const useRemovePurchasedWishModel = ({
    wishId,
    onRemovePurchased,
    onError,
    useMock = false,
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
            const runner = useMock ? mockRemovePurchasedWish : removePurchased
            await runner(wishId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove purchased status")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsRemoving(false)
        }
    }, [wishId, onRemovePurchased, onError, useMock])

    return {
        isRemoving,
        error,
        handleRemovePurchased,
    }
}
