"use client"

import {useTranslations} from "next-intl"

import {useCancelReservationModel} from "../model"

import styles from "./CancelReservationButton.module.css"
import type {TCancelReservationButton} from "./CancelReservationButton.types"


export const CancelReservationButton = ({wishId, onCancel, onError}: TCancelReservationButton) => {
    const t = useTranslations("wishCard")
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
                {isCancelling ? t("cancellingReservation") : t("cancelReservation")}
            </button>
            {error && (
                <span className={styles['cancel-button__error']}>{error}</span>
            )}
        </>
    )
}
