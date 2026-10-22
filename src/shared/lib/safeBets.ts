import { kv } from '@vercel/kv'

import type { TSafeBet } from '@/entities/safeBet'

export const safeBetsKey = (userId: string) => `user:${userId}:safeBets`
export const safeBetCommentsKey = (entryId: string) => `safebet:${entryId}:comments`

export const getSafeBets = async (userId: string): Promise<TSafeBet[]> =>
    (await kv.get<TSafeBet[]>(safeBetsKey(userId))) ?? []
