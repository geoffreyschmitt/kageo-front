"use client"

import {useCancelReservationModel} from "../model"
import type {TCancelReservationButton} from "./CancelReservationButton.types"

import styles from "./CancelReservationButton.module.css"

export const CancelReservationButton = ({wishId, onCancel, onError, useMock = false}: TCancelReservationButton) => {
    const {isCancelling, error, handleCancel} = useCancelReservationModel({
        wishId,
        onCancel,
        onError,
        useMock,
    })

    return (
        <>
            <button
                className={`${styles['cancel-button']}`}
                onClick={handleCancel}
                disabled={isCancelling}
            >
                {isCancelling ? "Cancelling..." : "Cancel Reservation"}
            </button>
            {error && (
                <span className={styles['cancel-button__error']}>{error}</span>
            )}
        </>
    )
}
