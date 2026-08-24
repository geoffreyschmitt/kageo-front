export const deleteAccount = async (): Promise<void> => {
    const res = await fetch('/api/user/me', { method: 'DELETE' })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }
}
