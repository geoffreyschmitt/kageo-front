export type TSafeBet = {
    id: string
    title: string
    description?: string
    imageUrl?: string
    createdAt: string
}

export type TSafeBetInput = { title?: unknown; description?: unknown; imageUrl?: unknown }

export const SAFE_BET_LIMITS = { title: 80, description: 500, imageUrl: 2048, maxEntries: 30 } as const
