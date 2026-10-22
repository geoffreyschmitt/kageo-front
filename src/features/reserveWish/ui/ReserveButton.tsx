"use client"

import {useTranslations} from "next-intl"

import {useReserveWishModel} from "../model"

import styles from "./ReserveButton.module.css"
import type {TReserveButton} from "./ReserveButton.types"


export const ReserveButton = ({wishId, userId, onReserve, onError, onRequireLogin}: TReserveButton) => {
    const t = useTranslations('wishCard')
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
                onClick={userId ? handleReserve : onRequireLogin}
                disabled={isReserving}
            >
                {isReserving ? t('reserving') : t('reserve')}
            </button>
            {error && (
                <span className={styles['reserved-button__error']}>{error}</span>
            )}
        </>
    )
}