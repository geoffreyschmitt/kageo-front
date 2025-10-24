import React from "react";

import {useShareWishlistModel} from "@/features/ShareWishlist/model";

import {Modal} from "@/shared/ui";

import styles from "./ShareWishlistModal.module.css";
import {TShareWishlistModal} from "./ShareWishlistModal.types";


export const ShareWishlistModal = ({ isOpen, onClose, wishlistUrl, wishlistName, onSendEmail }: TShareWishlistModal) => {
    const {
        email,
        emailError,
        isSending,
        sendSuccess,
        copySuccess,
        handleEmailChange,
        handleSendEmail,
        handleCopyLink,
        handleClose,
    } = useShareWishlistModel({ isOpen, onClose, onSendEmail, wishlistUrl })

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Share Wishlist"
            subtitle={`"${wishlistName}"`}
            className={styles.shareWishlistModal}
        >
            <div className={styles.shareWishlistModal__content}>
                {/* Copy Link Section */}
                <div className={styles.shareWishlistModal__section}>
                    <h3 className={styles.shareWishlistModal__sectionTitle}>Copy Link</h3>
                    <div className={styles.shareWishlistModal__linkGroup}>
                        <input
                            type="text"
                            className={styles.shareWishlistModal__linkInput}
                            value={wishlistUrl}
                            readOnly
                        />
                        <button
                            className={`${styles.shareWishlistModal__button} ${styles["shareWishlistModal__button--secondary"]}`}
                            onClick={handleCopyLink}
                        >
                            {copySuccess ? "Copied!" : "Copy Link"}
                        </button>
                    </div>
                    <p className={styles.shareWishlistModal__note}>
                        Anyone with this link can view your wishlist.
                    </p>
                </div>

                {/* Send Email Section */}
                <div className={styles.shareWishlistModal__section}>
                    <h3 className={styles.shareWishlistModal__sectionTitle}>Send via Email</h3>
                    <form className={styles.shareWishlistModal__emailForm} onSubmit={handleSendEmail}>
                        <input
                            type="email"
                            className={`${styles.shareWishlistModal__input} ${
                                emailError ? styles["shareWishlistModal__input--error"] : ""
                            }`}
                            placeholder="Enter recipient's email address"
                            value={email}
                            onChange={handleEmailChange}
                        />
                        {emailError && (
                            <span className={styles.shareWishlistModal__error}>{emailError}</span>
                        )}
                        {sendSuccess && (
                            <span className={styles.shareWishlistModal__success}>Email sent successfully!</span>
                        )}
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
