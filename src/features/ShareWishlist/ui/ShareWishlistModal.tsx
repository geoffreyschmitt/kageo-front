import React, {useState} from "react";

import styles from "./ShareWishlistModal.module.css";
import {TShareWishlistModal} from "./ShareWishlistModal.types";
import {Modal} from "@/shared/ui";

export const ShareWishlistModal = ({ isOpen, onClose, wishlistUrl, wishlistName, onSendEmail }: TShareWishlistModal) => {
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
        } catch {
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Share Wishlist"
            subtitle={'"{wishlistName}"'}
            className={styles.updateWishlistModal}
        >
                <div className={styles.shareWishlistModal__content}>
                    {/* Share Link Section */}
                    <div className={styles.shareWishlistModal__section}>
                        <h3 className={styles.shareWishlistModal__sectionTitle}>Copy Link</h3>
                        <div className={styles.shareWishlistModal__linkGroup}>
                            <input type="text" className={styles.shareWishlistModal__linkInput} value={wishlistUrl} readOnly />
                            <button
                                className={`${styles.shareWishlistModal__button} ${styles["shareWishlistModal__button--secondary"]}`}
                                onClick={handleCopyLink}
                            >
                                {copySuccess ? "Copied!" : "Copy Link"}
                            </button>
                        </div>
                        <p className={styles.shareWishlistModal__note}>Anyone with this link can view your wishlist.</p>
                    </div>

                    {/* Share via Email Section */}
                    <div className={styles.shareWishlistModal__section}>
                        <h3 className={styles.shareWishlistModal__sectionTitle}>Send via Email</h3>
                        <form className={styles.shareWishlistModal__emailForm} onSubmit={handleSendEmail}>
                            <input
                                type="email"
                                className={`${styles.shareWishlistModal__input} ${emailError ? styles["shareWishlistModal__input--error"] : ""}`}
                                placeholder="Enter recipient's email address"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    setEmailError("")
                                    setSendSuccess(false)
                                }}
                            />
                            {emailError && <span className={styles.shareWishlistModal__error}>{emailError}</span>}
                            {sendSuccess && <span className={styles.shareWishlistModal__success}>Email sent successfully!</span>}
                            <button
                                type="submit"
                                className={`${styles.shareWishlistModal__button} ${styles["shareWishlistModal__button--primary"]}`}
                                disabled={isSending}
                            >
                                {isSending ? "Sending..." : "Send Email"}
                            </button>
                        </form>
                    </div>
                </div>
        </Modal>
    )
}
