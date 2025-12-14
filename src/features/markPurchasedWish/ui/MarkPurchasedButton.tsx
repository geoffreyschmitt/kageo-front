"use client"

import {useMarkPurchasedWishModel} from "../model"
import type {TMarkPurchasedButton} from "./MarkPurchasedButton.types"

import styles from "./MarkPurchasedButton.module.css"

export const MarkPurchasedButton = ({wishId, onMarkPurchased, onError, useMock = false}: TMarkPurchasedButton) => {
    const {isMarking, error, handleMarkPurchased} = useMarkPurchasedWishModel({
        wishId,
        onMarkPurchased,
        onError,
        useMock,
    })

    return (
        <>
            <button
                className={`${styles['mark-purchased-button']}`}
                onClick={handleMarkPurchased}
                disabled={isMarking}
            >
                {isMarking ? "Marking..." : "Mark Purchased"}
            </button>
            {error && (
                <span className={styles['mark-purchased-button__error']}>{error}</span>
            )}
        </>
    )
}
