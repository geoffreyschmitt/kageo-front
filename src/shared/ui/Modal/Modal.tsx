import React from "react"
import styles from "./Modal.module.css"
import {TModal} from "@/shared/ui/Modal/Modal.types";


export const Modal = ({ isOpen, onClose, title, children, className = "" }: TModal) => {
    if (!isOpen) return null

    return (
        <div className={`${styles.modal} ${className}`}>
            <div className={styles.modal__overlay} onClick={onClose} />
            <div className={styles.modal__container}>
                <div className={styles.modal__header}>
                    <h2 className={styles.modal__title}>{title}</h2>
                    <button className={styles.modal__closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}