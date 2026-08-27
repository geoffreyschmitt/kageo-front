"use client"

import {useTranslations} from "next-intl"

import {useRemovePurchasedWishModel} from "../model"
import type {TRemovePurchasedButton} from "./RemovePurchasedButton.types"

import styles from "./RemovePurchasedButton.module.css"

export const RemovePurchasedButton = ({wishId, onRemovePurchased, onError, useMock = false}: TRemovePurchasedButton) => {
    const t = useTranslations('wishCard')
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
                {isRemoving ? t('cancellingPurchase') : t('cancelPurchase')}
            </button>
            {error && (
                <span className={styles['remove-purchased-button__error']}>{error}</span>
            )}
        </>
    )
}
