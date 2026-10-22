import type { TSafeBet } from '@/entities/safeBet'

import { assertOk } from '../assertOk'

import type { TSafeBetPayload } from './createSafeBet'

export const updateSafeBet = async (id: string, input: TSafeBetPayload): Promise<TSafeBet> => {
    const res = await fetch(`/api/safe-bets/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    await assertOk(res)
    return (await res.json()) as TSafeBet
}
