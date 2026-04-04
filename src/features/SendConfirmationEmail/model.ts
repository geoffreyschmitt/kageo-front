"use client"

import { useCallback, useState } from "react"

import { mockSendConfirmationEmail } from "./lib/mockSendConfirmationEmail"
// Future: import { sendConfirmationEmail } from "@/shared/api/auth/sendConfirmationEmail"

type TUseSendConfirmationEmailModelParams = {
    useMock?: boolean
}

/**
 * Hook for sending confirmation emails
 * Can be used client-side to resend confirmation emails
 */
export const useSendConfirmationEmailModel = ({
    useMock = false,
}: TUseSendConfirmationEmailModelParams = {}) => {
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const sendEmail = useCallback(
        async (email: string, confirmationToken: string) => {
            setError(null)
            setSuccess(false)
            setIsSending(true)

            try {
                // For now, only mock is available
                // When real backend is ready, use: const runner = useMock ? mockSendConfirmationEmail : sendConfirmationEmail
                const runner = mockSendConfirmationEmail
                await runner(email, confirmationToken)
                setSuccess(true)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to send confirmation email"
                setError(errorMessage)
                throw err
            } finally {
                setIsSending(false)
            }
        },
        [useMock]
    )

    return {
        isSending,
        error,
        success,
        sendEmail,
    }
}

