export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (!res.ok) {
        const data = await res.json().catch(() => ({ message: '' }))
        throw new Error(data.message || `API error ${res.status}`)
    }
}
