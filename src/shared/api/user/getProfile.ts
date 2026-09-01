export type TUserProfile = {
    id: string
    name: string
    email: string
    createdAt: string
    isPublic: boolean
    birthdate: string | null
    hasPassword: boolean
}

export const getProfile = async (): Promise<TUserProfile> => {
    const res = await fetch('/api/user/me')

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TUserProfile
}
