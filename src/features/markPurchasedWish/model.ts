"use client"

import {useCallback, useState} from "react"

import {markPurchased} from "@/shared/api/wish/markPurchased";
import {mockMarkPurchasedWish} from "./lib/mockMarkPurchasedWish"

type TUseMarkPurchasedWishModelParams = {
    wishId: string
    userId: string
    onMarkPurchased?: (wishId: string, userId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}

export const useMarkPurchasedWishModel = ({
    wishId,
    userId,
    onMarkPurchased,
    onError,
    useMock = false,
}: TUseMarkPurchasedWishModelParams) => {
    const [isMarking, setIsMarking] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleMarkPurchased = useCallback(async () => {
        setError(null)
        setIsMarking(true)

        try {
            // Optimistic update: call onMarkPurchased immediately
            if (onMarkPurchased) {
                onMarkPurchased(wishId, userId)
            }

            // Backend sync
            const runner = useMock ? mockMarkPurchasedWish : markPurchased
            await runner(wishId, userId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to mark wish as purchased")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsMarking(false)
        }
    }, [wishId, userId, onMarkPurchased, onError, useMock])

    return {
        isMarking,
        error,
        handleMarkPurchased,
    }
}
