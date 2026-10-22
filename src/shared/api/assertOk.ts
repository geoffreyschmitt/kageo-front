import { eventBus } from '@/shared/eventBus'

// Thrown on a 429; the app-wide toast already informed the user.
export class RateLimitedError extends Error {
    constructor() {
        super('API error 429: rate limited')
        this.name = 'RateLimitedError'
    }
}

// Throws for a non-ok response. A 429 also raises a calm, app-wide notice.
export const assertOk = async (res: Response): Promise<void> => {
    if (res.ok) return
    if (res.status === 429) {
        eventBus.emit('ui:rateLimited', {})
        throw new RateLimitedError()
    }
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
}
