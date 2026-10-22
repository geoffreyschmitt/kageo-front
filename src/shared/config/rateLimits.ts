// Rate limit rules. No server imports: client code may import this file.

export type TRateLimitName =
    | 'loginFailures'
    | 'register'
    | 'reserve'
    | 'contribute'
    | 'comment'
    | 'suggest'
    | 'invite'
    | 'inviteRecipient'
    | 'inviteDaily'
    | 'import'
    | 'write'
    | 'ipCeiling'

export type TWriteLimit = 'reserve' | 'contribute' | 'comment' | 'suggest' | 'invite' | 'import' | 'write'

export type TRateRule = { limit: number; windowSeconds: number }

export const RATE_LIMITED_ERROR = 'RATE_LIMITED'

const RULES: Record<TRateLimitName, TRateRule> = {
    loginFailures: { limit: 10, windowSeconds: 900 },
    register: { limit: 20, windowSeconds: 3600 },
    reserve: { limit: 30, windowSeconds: 600 },
    contribute: { limit: 30, windowSeconds: 600 },
    comment: { limit: 30, windowSeconds: 600 },
    suggest: { limit: 60, windowSeconds: 600 },
    invite: { limit: 30, windowSeconds: 600 },
    // Invite emails one address may receive per day, across all owners (keyed by the address).
    inviteRecipient: { limit: 10, windowSeconds: 86400 },
    // Invite emails one account may send per day (only counted when an email really goes out).
    inviteDaily: { limit: 50, windowSeconds: 86400 },
    import: { limit: 20, windowSeconds: 600 },
    write: { limit: 120, windowSeconds: 600 },
    ipCeiling: { limit: 600, windowSeconds: 600 },
}

const multiplier = (): number => {
    const value = Number(process.env.RATE_LIMIT_MULTIPLIER)
    return Number.isFinite(value) && value > 0 ? value : 1
}

export const getRule = (name: TRateLimitName): TRateRule => {
    const rule = RULES[name]
    return { limit: Math.max(1, Math.round(rule.limit * multiplier())), windowSeconds: rule.windowSeconds }
}
