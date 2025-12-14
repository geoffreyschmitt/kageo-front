"use client"

import {useCallback, useState} from "react"

import {reserveWish} from "@/services/wish/reserveWish";
import {mockReserveWish} from "./lib/mockReserveWish"

type TUseReserveWishModelParams = {
    wishId: string
    userId: string
    onReserve?: (wishId: string, reservedBy: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}

export const useReserveWishModel = ({
    wishId,
    userId,
    onReserve,
    onError,
    useMock = false,
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
            const runner = useMock ? mockReserveWish : reserveWish
            await runner(wishId, userId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reserve wish")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsReserving(false)
        }
    }, [wishId, userId, onReserve, onError, useMock])

    return {
        isReserving,
        error,
        handleReserve,
    }
}

