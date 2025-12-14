"use client"

import {useCallback, useState} from "react"

import {markPurchased} from "@/services/wish/markPurchased";
import {mockMarkPurchasedWish} from "./lib/mockMarkPurchasedWish"

type TUseMarkPurchasedWishModelParams = {
    wishId: string
    onMarkPurchased?: (wishId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}

export const useMarkPurchasedWishModel = ({
    wishId,
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
                onMarkPurchased(wishId)
            }

            // Backend sync
            const runner = useMock ? mockMarkPurchasedWish : markPurchased
            await runner(wishId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to mark wish as purchased")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsMarking(false)
        }
    }, [wishId, onMarkPurchased, onError, useMock])

    return {
        isMarking,
        error,
        handleMarkPurchased,
    }
}
