import { Resend } from 'resend'

// Server-only: sends the real confirmation email via Resend. Never import this from client components.
// TODO: RESEND_FROM_EMAIL is currently Resend's shared sandbox address (onboarding@resend.dev), which only
// delivers to the Resend account owner's own verified email. Verify a production domain in Resend and point
// RESEND_FROM_EMAIL at an address on it before this reaches real signups.
export const sendConfirmationEmail = async (email: string, confirmationToken: string): Promise<void> => {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM_EMAIL

    if (!apiKey || !from) {
        throw new Error('RESEND_API_KEY or RESEND_FROM_EMAIL is not configured')
    }

    const resend = new Resend(apiKey)
    const confirmationUrl = `${process.env.NEXTAUTH_URL}/api/auth/confirm-email?token=${confirmationToken}`

    const { error } = await resend.emails.send({
        from,
        to: email,
        subject: 'Confirm your Kageo account',
        html: `<p>Welcome to Kageo!</p><p>Please confirm your email address by clicking the link below:</p><p><a href="${confirmationUrl}">Confirm my email</a></p>`,
    })

    if (error) {
        throw new Error(`Failed to send confirmation email: ${error.message}`)
    }
}
