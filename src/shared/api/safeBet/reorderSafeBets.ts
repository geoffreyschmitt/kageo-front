import type { TSafeBet } from '@/entities/safeBet'

import { assertOk } from '../assertOk'

export const reorderSafeBets = async (ids: string[]): Promise<TSafeBet[]> => {
    const res = await fetch('/api/safe-bets/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    })
    await assertOk(res)
    return (await res.json()) as TSafeBet[]
}
