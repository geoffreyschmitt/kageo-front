/**
 * Mock service for sending confirmation emails
 * Simulates sending an email confirmation to a newly registered user
 * 
 * @param email - User's email address
 * @param confirmationToken - Token for email confirmation
 * @returns Promise that resolves when email is "sent"
 */
export const mockSendConfirmationEmail = async (
    email: string,
    confirmationToken: string
): Promise<void> => {
    console.info("[mockSendConfirmationEmail] Sending confirmation email to", email, "with token:", confirmationToken)
    
    // Simulate API call for sending email (1 second delay)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    // In a real implementation, this would:
    // 1. Call an email service (SendGrid, AWS SES, etc.)
    // 2. Send an email with a confirmation link
    // 3. The link would be: {APP_URL}/api/auth/confirm-email?token={confirmationToken}
    
    console.info("[mockSendConfirmationEmail] Confirmation email sent successfully to", email)
}

