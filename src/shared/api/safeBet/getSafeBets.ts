import type { TSafeBet } from '@/entities/safeBet'

import { assertOk } from '../assertOk'

export const getSafeBets = async (): Promise<TSafeBet[]> => {
    const res = await fetch('/api/safe-bets')
    await assertOk(res)
    return (await res.json()) as TSafeBet[]
}
