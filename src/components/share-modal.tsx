"use client"

import type React from "react"

import { useState } from "react"
import styles from "./share-modal.module.css"

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    wishlistUrl: string
    wishlistName: string
    onSendEmail: (email: string, url: string) => Promise<void>
}

export default function ShareModal({ isOpen, onClose, wishlistUrl, wishlistName, onSendEmail }: ShareModalProps) {
    const [email, setEmail] = useState("")
    const [emailError, setEmailError] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [sendSuccess, setSendSuccess] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)

    const isValidEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        setEmailError("")
        setSendSuccess(false)

        if (!email.trim()) {
            setEmailError("Email address is required.")
            return
        }

        if (!isValidEmail(email)) {
            setEmailError("Please enter a valid email address.")
            return
        }

        setIsSending(true)
        try {
            await onSendEmail(email, wishlistUrl)
            setSendSuccess(true)
            setEmail("") // Clear email input on success
        } catch (error) {
            setEmailError("Failed to send email. Please try again.")
        } finally {
            setIsSending(false)
        }
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(wishlistUrl)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000) // Reset success message after 2 seconds
    }

    const handleClose = () => {
        setEmail("")
        setEmailError("")
        setIsSending(false)
        setSendSuccess(false)
        setCopySuccess(false)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className={styles.shareModal}>
            <div className={styles.shareModal__overlay} onClick={handleClose} />
            <div className={styles.shareModal__container}>
                <div className={styles.shareModal__header}>
                    <div className={styles.shareModal__headerContent}>
                        <h2 className={styles.shareModal__title}>Share Wishlist</h2>
                        <p className={styles.shareModal__subtitle}>"{wishlistName}"</p>
                    </div>
                    <button className={styles.shareModal__closeButton} onClick={handleClose}>
                        ×
                    </button>
                </div>

                <div className={styles.shareModal__content}>
                    {/* Share Link Section */}
                    <div className={styles.shareModal__section}>
                        <h3 className={styles.shareModal__sectionTitle}>Copy Link</h3>
                        <div className={styles.shareModal__linkGroup}>
                            <input type="text" className={styles.shareModal__linkInput} value={wishlistUrl} readOnly />
                            <button
                                className={`${styles.shareModal__button} ${styles["shareModal__button--secondary"]}`}
                                onClick={handleCopyLink}
                            >
                                {copySuccess ? "Copied!" : "Copy Link"}
                            </button>
                        </div>
                        <p className={styles.shareModal__note}>Anyone with this link can view your wishlist.</p>
                    </div>

                    {/* Share via Email Section */}
                    <div className={styles.shareModal__section}>
                        <h3 className={styles.shareModal__sectionTitle}>Send via Email</h3>
                        <form className={styles.shareModal__emailForm} onSubmit={handleSendEmail}>
                            <input
                                type="email"
                                className={`${styles.shareModal__input} ${emailError ? styles["shareModal__input--error"] : ""}`}
                                placeholder="Enter recipient's email address"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    setEmailError("")
                                    setSendSuccess(false)
                                }}
                            />
                            {emailError && <span className={styles.shareModal__error}>{emailError}</span>}
                            {sendSuccess && <span className={styles.shareModal__success}>Email sent successfully!</span>}
                            <button
                                type="submit"
                                className={`${styles.shareModal__button} ${styles["shareModal__button--primary"]}`}
                                disabled={isSending}
                            >
                                {isSending ? "Sending..." : "Send Email"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
