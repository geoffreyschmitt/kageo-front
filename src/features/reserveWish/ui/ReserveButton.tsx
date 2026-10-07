"use client"

import {useReserveWishModel} from "../model"

import styles from "./ReserveButton.module.css"
import type {TReserveButton} from "./ReserveButton.types"


export const ReserveButton = ({wishId, userId, onReserve, onError}: TReserveButton) => {
    const {isReserving, error, handleReserve} = useReserveWishModel({
        wishId,
        userId,
        onReserve,
        onError,
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