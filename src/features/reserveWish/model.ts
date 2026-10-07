"use client"

import {useCallback, useState} from "react"

import {reserveWish} from "@/shared/api/wish/reserveWish";

type TUseReserveWishModelParams = {
    wishId: string
    userId: string
    onReserve?: (wishId: string, reservedBy: string) => void
    onError?: (wishId: string) => void
}

export const useReserveWishModel = ({
    wishId,
    userId,
    onReserve,
    onError,
}: TUseReserveWishModelParams) => {
    const [isReserving, setIsReserving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleReserve = useCallback(async () => {
        setError(null)
        setIsReserving(true)

        try {
            // Optimistic update: call onReserve immediately
            if (onReserve) {
                onReserve(wishId, userId)
            }

            // Backend sync
            await reserveWish(wishId, userId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reserve wish")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsReserving(false)
        }
    }, [wishId, userId, onReserve, onError])

    return {
        isReserving,
        error,
        handleReserve,
    }
}

