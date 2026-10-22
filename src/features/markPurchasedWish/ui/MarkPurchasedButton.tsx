"use client"

import {useTranslations} from "next-intl"

import {useMarkPurchasedWishModel} from "../model"

import styles from "./MarkPurchasedButton.module.css"
import type {TMarkPurchasedButton} from "./MarkPurchasedButton.types"


export const MarkPurchasedButton = ({wishId, userId, onMarkPurchased, onError}: TMarkPurchasedButton) => {
    const t = useTranslations("wishCard")
    const {isMarking, error, handleMarkPurchased} = useMarkPurchasedWishModel({
        wishId,
        userId,
        onMarkPurchased,
        onError,
    })

    return (
        <>
            <button
                className={`${styles['mark-purchased-button']}`}
                onClick={handleMarkPurchased}
                disabled={isMarking}
            >
                {isMarking ? t("markingPurchased") : t("markPurchased")}
            </button>
            {error && (
                <span className={styles['mark-purchased-button__error']}>{error}</span>
            )}
        </>
    )
}
