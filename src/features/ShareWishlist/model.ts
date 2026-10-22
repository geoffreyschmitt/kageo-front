import { useState } from "react"

import { useTranslations } from "next-intl"

import { RateLimitedError } from "@/shared/api/assertOk"
import { ShareWishlistError, type TShareWishlistResponse } from "@/shared/api/wishlist/shareWishlist"

type TUseShareWishlistModelParams = {
    isOpen: boolean
    onClose: () => void
    wishlistUrl: string
    onSendEmail: (email: string, url: string) => Promise<TShareWishlistResponse>
}

export const useShareWishlistModel = ({
    onClose,
    wishlistUrl,
    onSendEmail,
}: TUseShareWishlistModelParams) => {
    const t = useTranslations("shareWishlistModal")
    const [email, setEmail] = useState("")
    const [emailError, setEmailError] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [sendSuccess, setSendSuccess] = useState(false)
    const [alreadyInvited, setAlreadyInvited] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    const clearFeedback = () => {
        setEmailError("")
        setSendSuccess(false)
        setAlreadyInvited(false)
    }

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value)
        clearFeedback()
    }

    const errorMessageFor = (err: unknown) => {
        if (err instanceof ShareWishlistError) {
            return err.code === "EMAIL_REJECTED" ? t("errorRejected") : t("errorUnavailable")
        }
        // A 429 already raised its own app-wide notice.
        if (err instanceof RateLimitedError) return ""
        return t("errorGeneric")
    }

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        clearFeedback()

        if (!email.trim()) return setEmailError(t("emailRequired"))
        if (!isValidEmail(email.trim())) return setEmailError(t("emailInvalid"))

        setIsSending(true)
        try {
            const result = await onSendEmail(email.trim(), wishlistUrl)
            if (result.alreadyInvited) setAlreadyInvited(true)
            else setSendSuccess(true)
            setEmail("")
        } catch (err) {
            setEmailError(errorMessageFor(err))
        } finally {
            setIsSending(false)
        }
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(wishlistUrl)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
    }

    const handleClose = () => {
        setEmail("")
        clearFeedback()
        setIsSending(false)
        setCopySuccess(false)
        onClose()
    }

    return {
        email,
        emailError,
        isSending,
        sendSuccess,
        alreadyInvited,
        copySuccess,
        handleEmailChange,
        handleSendEmail,
        handleCopyLink,
        handleClose,
    }
}
