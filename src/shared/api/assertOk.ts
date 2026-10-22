import { eventBus } from '@/shared/eventBus'

// Thrown on a 429; the app-wide toast already informed the user.
export class RateLimitedError extends Error {
    constructor() {
        super('API error 429: rate limited')
        this.name = 'RateLimitedError'
    }
}

// Thrown on a 403 with code NOT_INVITED: the signed-in account may read this private list but
// not act on it, because its email was not invited. The message is empty on purpose: the toast
// (or the comments notice) explains it, and models that print `err.message` then show nothing.
export class NotInvitedError extends Error {
    constructor() {
        super('')
        this.name = 'NotInvitedError'
    }
}

const codeOf = (text: string): string | undefined => {
    try {
        const body = JSON.parse(text) as { code?: unknown }
        return typeof body.code === 'string' ? body.code : undefined
    } catch {
        return undefined
    }
}

// Throws for a non-ok response. A 429 also raises a calm, app-wide notice; so does a NOT_INVITED
// 403 unless the caller shows its own (pass notifyNotInvited: false, e.g. a read done on page load).
export const assertOk = async (res: Response, options: { notifyNotInvited?: boolean } = {}): Promise<void> => {
    if (res.ok) return
    if (res.status === 429) {
        eventBus.emit('ui:rateLimited', {})
        throw new RateLimitedError()
    }
    const text = await res.text().catch(() => '')
    if (res.status === 403 && codeOf(text) === 'NOT_INVITED') {
        if (options.notifyNotInvited !== false) eventBus.emit('ui:notInvited', {})
        throw new NotInvitedError()
    }
    throw new Error(`API error ${res.status}: ${text}`)
}
