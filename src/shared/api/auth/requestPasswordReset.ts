import { assertOk } from '../assertOk'

export const requestPasswordReset = async (email: string, locale: string): Promise<void> => {
    const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
    })

    await assertOk(res)
}
