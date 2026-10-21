import { assertOk } from '../assertOk'

export const deleteAccount = async (): Promise<void> => {
    const res = await fetch('/api/user/me', { method: 'DELETE' })

    await assertOk(res)
}
