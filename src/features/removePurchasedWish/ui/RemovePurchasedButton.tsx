"use client"

import {useTranslations} from "next-intl"

import {useRemovePurchasedWishModel} from "../model"

import styles from "./RemovePurchasedButton.module.css"
import type {TRemovePurchasedButton} from "./RemovePurchasedButton.types"


export const RemovePurchasedButton = ({wishId, onRemovePurchased, onError}: TRemovePurchasedButton) => {
    const t = useTranslations('wishCard')
    const {isRemoving, error, handleRemovePurchased} = useRemovePurchasedWishModel({
        wishId,
        onRemovePurchased,
        onError,
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
