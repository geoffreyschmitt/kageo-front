"use client"

import {useCallback, useState} from "react"

import {useTranslations} from "next-intl"

import {markPurchased} from "@/shared/api/wish/markPurchased";

type TUseMarkPurchasedWishModelParams = {
    wishId: string
    userId: string
    onMarkPurchased?: (wishId: string, userId: string) => void
    onError?: (wishId: string) => void
}

export const useMarkPurchasedWishModel = ({
    wishId,
    userId,
    onMarkPurchased,
    onError,
}: TUseMarkPurchasedWishModelParams) => {
    const t = useTranslations("wishlistToast")
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
            await markPurchased(wishId, userId)
        } catch (err) {
            setError(err instanceof Error ? err.message : t("markPurchasedError"))
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsMarking(false)
        }
    }, [wishId, userId, onMarkPurchased, onError, t])

    return {
        isMarking,
        error,
        handleMarkPurchased,
    }
}
