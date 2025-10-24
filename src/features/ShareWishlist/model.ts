import { useState } from "react"

type TUseShareWishlistModelParams = {
    isOpen: boolean
    onClose: () => void
    wishlistUrl: string
    onSendEmail: (email: string, url: string) => Promise<void>
}

export const useShareWishlistModel = ({
    onClose,
    wishlistUrl,
    onSendEmail,
}: TUseShareWishlistModelParams) => {
    const [email, setEmail] = useState("")
    const [emailError, setEmailError] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [sendSuccess, setSendSuccess] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value)
        setEmailError("")
        setSendSuccess(false)
    }

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        setEmailError("")
        setSendSuccess(false)

        if (!email.trim()) return setEmailError("Email address is required.")
        if (!isValidEmail(email)) return setEmailError("Please enter a valid email address.")

        setIsSending(true)
        try {
            await onSendEmail(email, wishlistUrl)
            setSendSuccess(true)
            setEmail("")
        } catch {
            setEmailError("Failed to send email. Please try again.")
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
        setEmailError("")
        setIsSending(false)
        setSendSuccess(false)
        setCopySuccess(false)
        onClose()
    }

    return {
        email,
        emailError,
        isSending,
        sendSuccess,
        copySuccess,
        handleEmailChange,
        handleSendEmail,
        handleCopyLink,
        handleClose,
    }
}