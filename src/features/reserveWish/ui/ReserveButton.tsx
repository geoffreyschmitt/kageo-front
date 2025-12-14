"use client"

import {useReserveWishModel} from "../model"
import type {TReserveButton} from "./ReserveButton.types"

import styles from "./ReserveButton.module.css"

export const ReserveButton = ({wishId, userId, onReserve, onError, useMock = false}: TReserveButton) => {
    const {isReserving, error, handleReserve} = useReserveWishModel({
        wishId,
        userId,
        onReserve,
        onError,
        useMock,
    })

    return (
        <>
            <button
                className={`${styles['reserved-button']}`}
                onClick={handleReserve}
                disabled={isReserving}
            >
                {isReserving ? "Reserving..." : "Reserve"}
            </button>
            {error && (
                <span className={styles['reserved-button__error']}>{error}</span>
            )}
        </>
    )
}