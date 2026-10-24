"use client"

import React from "react"

import { useTranslations } from "next-intl"

import {TModal} from "@/shared/ui/Modal/Modal.types";

import styles from "./Modal.module.css"

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const Modal = ({ isOpen, onClose, title, subtitle, children, className = "", closeOnOverlayClick = true }: TModal) => {
    const t = useTranslations('modal')
    const titleId = React.useId()
    const containerRef = React.useRef<HTMLDivElement>(null)
    const onCloseRef = React.useRef(onClose)
    React.useEffect(() => { onCloseRef.current = onClose })

    // Move focus into the dialog on open and hand it back to the trigger on close.
    React.useEffect(() => {
        if (!isOpen) return
        const opener = document.activeElement as HTMLElement | null
        containerRef.current?.focus()

        // On the document, so Escape and Tab still work after a click on the backdrop drops focus to <body>.
        const onKeyDown = (e: KeyboardEvent) => {
            const container = containerRef.current
            if (!container) return
            if (e.key === 'Escape') {
                onCloseRef.current()
                return
            }
            if (e.key !== 'Tab') return

            // Keep Tab inside the dialog.
            const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
            if (nodes.length === 0) return
            const first = nodes[0]
            const last = nodes[nodes.length - 1]
            const active = document.activeElement
            const outside = !container.contains(active) || active === container
            if (e.shiftKey && (outside || active === first)) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && (outside || active === last)) {
                e.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            opener?.focus?.()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className={`${styles.modal} ${className}`}>
            <div className={styles.modal__overlay} onClick={closeOnOverlayClick ? onClose : undefined} />
            <div
                ref={containerRef}
                className={styles.modal__container}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <div className={styles.modal__header}>
                    <div className={styles.modal__headerContent}>
                        <h2 id={titleId} className={styles.modal__title}>{title}</h2>
                        {subtitle && (
                            <p className={styles.modal__subtitle}>{subtitle}</p>
                        )}
                    </div>
                    <button type="button" className={styles.modal__closeButton} onClick={onClose} aria-label={t('close')}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                            <path d="M2 2l10 10M12 2L2 12" />
                        </svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}
