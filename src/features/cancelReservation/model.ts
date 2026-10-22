"use client"

import {useCallback, useState} from "react"

import {useTranslations} from "next-intl"

import {cancelReservation} from "@/shared/api/wish/cancelReservation";

type TUseCancelReservationModelParams = {
    wishId: string
    onCancel?: (wishId: string) => void
    onError?: (wishId: string) => void
}

export const useCancelReservationModel = ({
    wishId,
    onCancel,
    onError,
}: TUseCancelReservationModelParams) => {
    const t = useTranslations("wishlistToast")
    const [isCancelling, setIsCancelling] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCancel = useCallback(async () => {
        setError(null)
        setIsCancelling(true)

        try {
            // Optimistic update: call onCancel immediately
            if (onCancel) {
                onCancel(wishId)
            }

            // Backend sync
            await cancelReservation(wishId)
        } catch (err) {
            setError(err instanceof Error ? err.message : t("cancelError"))
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsCancelling(false)
        }
    }, [wishId, onCancel, onError, t])

    return {
        isCancelling,
        error,
        handleCancel,
    }
}
