import { eventBus } from '@/shared/eventBus'

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (!res.ok) {
        if (res.status === 429) eventBus.emit('ui:rateLimited', {})
        const data = await res.json().catch(() => ({ message: '' }))
        throw new Error(data.message || `API error ${res.status}`)
    }
}
