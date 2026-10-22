import type { TSafeBet } from '@/entities/safeBet'

import { assertOk } from '../assertOk'

export type TSafeBetPayload = { title: string; description?: string; imageUrl?: string }

export const createSafeBet = async (input: TSafeBetPayload): Promise<TSafeBet> => {
    const res = await fetch('/api/safe-bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    await assertOk(res)
    return (await res.json()) as TSafeBet
}
