import { eventBus } from '@/shared/eventBus'

// Throws for a non-ok response. A 429 also raises a calm, app-wide notice.
export const assertOk = async (res: Response): Promise<void> => {
    if (res.ok) return
    if (res.status === 429) {
        eventBus.emit('ui:rateLimited', {})
        throw new Error('API error 429: rate limited')
    }
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
}
