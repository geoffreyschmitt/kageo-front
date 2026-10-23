import { assertOk } from '../assertOk'

// The link in the email is wrong, already used, or older than an hour.
export class InvalidResetLinkError extends Error {
    constructor() {
        super('')
        this.name = 'InvalidResetLinkError'
    }
}

export const resetPassword = async (token: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
    })

    if (res.status === 400) {
        const body = (await res.clone().json().catch(() => ({}))) as { code?: string }
        if (body.code === 'INVALID_TOKEN') throw new InvalidResetLinkError()
    }
    await assertOk(res)
}
