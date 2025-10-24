import React from "react"

import {TModal} from "@/shared/ui/Modal/Modal.types";

import styles from "./Modal.module.css"


export const Modal = ({ isOpen, onClose, title, subtitle, children, className = "" }: TModal) => {
    if (!isOpen) return null

    return (
        <div className={`${styles.modal} ${className}`}>
            <div className={styles.modal__overlay} onClick={onClose} />
            <div className={styles.modal__container}>
                <div className={styles.modal__header}>
                    <div className={styles.modal__headerContent}>
                        <h2 className={styles.modal__title}>{title}</h2>
                        {subtitle && (
                            <p className={styles.modal__subtitle}>{subtitle}</p>
                        )}
                    </div>
                    <button className={styles.modal__closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}