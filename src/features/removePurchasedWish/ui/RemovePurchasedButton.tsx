"use client"

import {useRemovePurchasedWishModel} from "../model"
import type {TRemovePurchasedButton} from "./RemovePurchasedButton.types"

import styles from "./RemovePurchasedButton.module.css"

export const RemovePurchasedButton = ({wishId, onRemovePurchased, onError, useMock = false}: TRemovePurchasedButton) => {
    const {isRemoving, error, handleRemovePurchased} = useRemovePurchasedWishModel({
        wishId,
        onRemovePurchased,
        onError,
        useMock,
    })

    return (
        <>
            <button
                className={`${styles['remove-purchased-button']}`}
                onClick={handleRemovePurchased}
                disabled={isRemoving}
            >
                {isRemoving ? "Removing..." : "Remove Purchased"}
            </button>
            {error && (
                <span className={styles['remove-purchased-button__error']}>{error}</span>
            )}
        </>
    )
}
