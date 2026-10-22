import { assertOk } from '../assertOk'

export const deleteSafeBet = async (id: string): Promise<void> => {
    const res = await fetch(`/api/safe-bets/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await assertOk(res)
}
