import { assertOk } from '../assertOk'

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

    await assertOk(res)

    return (await res.json()) as TUserProfile
}
