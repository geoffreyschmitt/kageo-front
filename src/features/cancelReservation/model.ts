"use client"

import {useCallback, useState} from "react"

import {cancelReservation} from "@/shared/api/wish/cancelReservation";
import {mockCancelReservation} from "./lib/mockCancelReservation"

type TUseCancelReservationModelParams = {
    wishId: string
    onCancel?: (wishId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}

export const useCancelReservationModel = ({
    wishId,
    onCancel,
    onError,
    useMock = false,
}: TUseCancelReservationModelParams) => {
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
            const runner = useMock ? mockCancelReservation : cancelReservation
            await runner(wishId)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to cancel reservation")
            // Revert optimistic update
            if (onError) {
                onError(wishId)
            }
        } finally {
            setIsCancelling(false)
        }
    }, [wishId, onCancel, onError, useMock])

    return {
        isCancelling,
        error,
        handleCancel,
    }
}
