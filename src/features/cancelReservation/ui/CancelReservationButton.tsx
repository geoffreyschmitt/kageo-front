"use client"

import {useCancelReservationModel} from "../model"

import styles from "./CancelReservationButton.module.css"
import type {TCancelReservationButton} from "./CancelReservationButton.types"


export const CancelReservationButton = ({wishId, onCancel, onError}: TCancelReservationButton) => {
    const {isCancelling, error, handleCancel} = useCancelReservationModel({
        wishId,
        onCancel,
        onError,
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
